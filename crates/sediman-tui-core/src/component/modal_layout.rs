use crate::renderer::{CellBuffer, Rect, Style, TextAttributes, display_width, truncate_str};
use crate::styling::Theme;

use super::block::{fill_area, fill_row};
use super::border::{draw_border, draw_rounded_border};
use super::input_row::{draw_input_row, InputRowConfig};
use super::list::ScrollableList;

pub enum BorderKind {
    Square { top: Style, bottom: Style },
    Rounded(Style),
}

#[derive(Clone, Copy)]
pub enum CloseHint {
    Esc,
    Q,
    None,
}

impl CloseHint {
    pub fn text(self) -> &'static str {
        match self {
            CloseHint::Esc => " Esc ",
            CloseHint::Q => " q to close ",
            CloseHint::None => "",
        }
    }
}

pub struct ModalConfig {
    pub border: BorderKind,
    pub close_hint: CloseHint,
    pub footer_hints: Option<&'static str>,
}

impl Default for ModalConfig {
    fn default() -> Self {
        Self {
            border: BorderKind::Square {
                top: Style::new(),
                bottom: Style::new(),
            },
            close_hint: CloseHint::Esc,
            footer_hints: None,
        }
    }
}

fn dim_background(buf: &mut CellBuffer, area: Rect, bg: crate::renderer::Color, fg: crate::renderer::Color) {
    for sy in area.y..area.bottom() {
        for sx in area.x..area.right() {
            if let Some(cell) = buf.get_mut(sx, sy) {
                cell.style = Style::new().bg(bg).fg(fg);
            }
        }
    }
}

pub struct ModalLayout {
    pub modal: Rect,
    pub inner_x: u16,
    pub inner_w: usize,
    cursor_y: u16,
    content_top: u16,
    content_bottom: u16,
    footer_hints: Option<&'static str>,
}

impl ModalLayout {
    pub fn new(
        buf: &mut CellBuffer,
        area: Rect,
        theme: &Theme,
        modal_w: u16,
        modal_h: u16,
        config: ModalConfig,
    ) -> Self {
        let modal_x = area.x + area.width.saturating_sub(modal_w) / 2;
        let modal_y = area.y + area.height.saturating_sub(modal_h) / 2;
        let modal = Rect::new(modal_x, modal_y, modal_w, modal_h);

        dim_background(buf, area, theme.background_darker, theme.text_muted);
        fill_area(buf, modal, Style::new().bg(theme.background).fg(theme.text));

        match &config.border {
            BorderKind::Square { top, bottom } => {
                draw_border(buf, modal, *top, *bottom);
            }
            BorderKind::Rounded(style) => {
                draw_rounded_border(buf, modal, *style);
            }
        }

        let footer_reserve = if config.footer_hints.is_some() { 3u16 } else { 0 };
        let content_top = modal.y + 1;
        let content_bottom = modal.bottom().saturating_sub(1 + footer_reserve);

        if let CloseHint::None = config.close_hint {
        } else {
            let hint = config.close_hint.text();
            let hint_style = Style::new().fg(theme.text_muted).bg(theme.background);
            let x = modal.right().saturating_sub(display_width(hint) + 2);
            buf.draw_str(x, modal.y, hint, hint_style);
        }

        Self {
            modal,
            inner_x: modal.x + 2,
            inner_w: modal.width.saturating_sub(4) as usize,
            cursor_y: content_top,
            content_top,
            content_bottom,
            footer_hints: config.footer_hints,
        }
    }

    pub fn cursor_y(&self) -> u16 {
        self.cursor_y
    }

    pub fn remaining_rows(&self) -> u16 {
        self.content_bottom.saturating_sub(self.cursor_y)
    }

    pub fn content_height(&self) -> u16 {
        self.content_bottom.saturating_sub(self.content_top)
    }

    pub fn content_start(&self) -> u16 {
        self.content_top
    }

    pub fn content_end(&self) -> u16 {
        self.content_bottom
    }

    pub fn modal_bottom(&self) -> u16 {
        self.modal.bottom()
    }

    pub fn has_room(&self) -> bool {
        self.cursor_y < self.content_bottom
    }

    pub fn advance(&mut self, rows: u16) {
        self.cursor_y = self.cursor_y.saturating_add(rows);
    }

    pub fn title(&mut self, buf: &mut CellBuffer, text: &str, style: Style) -> &mut Self {
        buf.draw_str(self.modal.x + 2, self.cursor_y, text, style);
        self.cursor_y = self.cursor_y.saturating_add(1);
        self
    }

    pub fn separator(&mut self, buf: &mut CellBuffer, style: Style) -> &mut Self {
        for sx in (self.modal.x + 1)..(self.modal.right() - 1) {
            buf.put_char(sx, self.cursor_y, '\u{2500}', style);
        }
        self.cursor_y = self.cursor_y.saturating_add(1);
        self
    }

    pub fn blank(&mut self) -> &mut Self {
        self.cursor_y = self.cursor_y.saturating_add(1);
        self
    }

    pub fn text(&mut self, buf: &mut CellBuffer, text: &str, style: Style) -> &mut Self {
        if !self.has_room() {
            return self;
        }
        buf.draw_str(self.inner_x, self.cursor_y, truncate_str(text, self.inner_w), style);
        self.cursor_y = self.cursor_y.saturating_add(1);
        self
    }

    pub fn styled_line(
        &mut self,
        buf: &mut CellBuffer,
        text: &str,
        style: Style,
    ) -> &mut Self {
        self.text(buf, text, style)
    }

    pub fn input_row(
        &mut self,
        buf: &mut CellBuffer,
        config: &InputRowConfig,
        theme: &Theme,
    ) -> &mut Self {
        if !self.has_room() {
            return self;
        }
        let input_x = self.modal.x + 1;
        let input_w = self.inner_w + 2;
        draw_input_row(buf, input_x, self.cursor_y, input_w, config, theme);
        self.cursor_y = self.cursor_y.saturating_add(1);
        self
    }

    pub fn draw_item(
        &mut self,
        buf: &mut CellBuffer,
        text: &str,
        selected: bool,
        theme: &Theme,
    ) -> &mut Self {
        if !self.has_room() {
            return self;
        }
        if selected {
            let sel_style = Style::new()
                .bg(theme.primary)
                .fg(theme.background)
                .add_modifier(TextAttributes::bold());
            fill_row(
                buf,
                self.cursor_y,
                self.modal.x + 1,
                self.modal.right() - 1,
                Style::new().bg(theme.primary).fg(theme.background),
            );
            buf.draw_str(self.inner_x, self.cursor_y, truncate_str(text, self.inner_w), sel_style);
        } else {
            buf.draw_str(
                self.inner_x,
                self.cursor_y,
                truncate_str(text, self.inner_w),
                Style::new().fg(theme.text).bg(theme.background),
            );
        }
        self.cursor_y = self.cursor_y.saturating_add(1);
        self
    }

    pub fn draw_item_custom(
        &mut self,
        buf: &mut CellBuffer,
        text: &str,
        selected: bool,
        unselected_style: Style,
        theme: &Theme,
    ) -> &mut Self {
        if !self.has_room() {
            return self;
        }
        if selected {
            let sel_style = Style::new()
                .bg(theme.primary)
                .fg(theme.background)
                .add_modifier(TextAttributes::bold());
            fill_row(
                buf,
                self.cursor_y,
                self.modal.x + 1,
                self.modal.right() - 1,
                Style::new().bg(theme.primary).fg(theme.background),
            );
            buf.draw_str(self.inner_x, self.cursor_y, truncate_str(text, self.inner_w), sel_style);
        } else {
            buf.draw_str(self.inner_x, self.cursor_y, truncate_str(text, self.inner_w), unselected_style);
        }
        self.cursor_y = self.cursor_y.saturating_add(1);
        self
    }

    pub fn draw_item_with_marker(
        &mut self,
        buf: &mut CellBuffer,
        text: &str,
        selected: bool,
        is_current: bool,
        theme: &Theme,
    ) -> &mut Self {
        if !self.has_room() {
            return self;
        }
        if selected {
            let sel_style = Style::new()
                .bg(theme.primary)
                .fg(theme.background)
                .add_modifier(TextAttributes::bold());
            fill_row(
                buf,
                self.cursor_y,
                self.modal.x + 1,
                self.modal.right() - 1,
                Style::new().bg(theme.primary).fg(theme.background),
            );
            buf.draw_str(self.inner_x, self.cursor_y, truncate_str(text, self.inner_w), sel_style);
        } else {
            let fg = if is_current { theme.secondary } else { theme.text };
            buf.draw_str(
                self.inner_x,
                self.cursor_y,
                truncate_str(text, self.inner_w),
                Style::new().fg(fg).bg(theme.background),
            );
        }
        self.cursor_y = self.cursor_y.saturating_add(1);
        self
    }

    pub fn highlight_row(&self, buf: &mut CellBuffer, style: Style) {
        fill_row(
            buf,
            self.cursor_y,
            self.modal.x + 1,
            self.modal.right() - 1,
            style,
        );
    }

    pub fn scrollable_items<F>(
        &mut self,
        buf: &mut CellBuffer,
        list: &ScrollableList,
        theme: &Theme,
        mut render_item: F,
    ) -> &mut Self
    where
        F: FnMut(&mut CellBuffer, u16, usize, bool, usize, u16, usize, &Theme),
    {
        for (idx, is_selected, row) in list.iter_visible() {
            if !self.has_room() {
                break;
            }
            render_item(
                buf,
                self.cursor_y,
                idx,
                is_selected,
                row,
                self.inner_x,
                self.inner_w,
                theme,
            );
            self.cursor_y = self.cursor_y.saturating_add(1);
        }

        if list.total > list.visible {
            let track_x = self.modal.right() - 1;
            let visible_start = list.scroll as f32 / list.total as f32;
            let visible_end = (list.scroll + list.visible) as f32 / list.total as f32;
            let content_h = self.content_bottom.saturating_sub(self.content_top) as f32;
            for sy in self.content_top..self.content_bottom {
                let frac = (sy - self.content_top) as f32 / content_h;
                let ch = if frac >= visible_start && frac < visible_end {
                    '\u{2588}'
                } else {
                    '\u{2591}'
                };
                let thumb_style = Style::new().fg(theme.text_muted).bg(theme.background);
                buf.put_char(track_x, sy, ch, thumb_style);
            }
        }

        self
    }

    pub fn collapsible<F>(
        &mut self,
        buf: &mut CellBuffer,
        label: &str,
        expanded: bool,
        theme: &Theme,
        mut render_content: F,
    ) -> &mut Self
    where
        F: FnMut(&mut Self, &mut CellBuffer),
    {
        if !self.has_room() {
            return self;
        }
        let arrow = if expanded { '\u{25BE}' } else { '\u{25B8}' };
        let header_style = Style::new().fg(theme.secondary).bg(theme.background);
        buf.draw_str(self.inner_x, self.cursor_y, truncate_str(label, self.inner_w), header_style);
        buf.put_char(self.inner_x + display_width(label) + 1, self.cursor_y, arrow, header_style);
        self.cursor_y = self.cursor_y.saturating_add(1);

        if expanded {
            render_content(self, buf);
        }
        self
    }

    pub fn footer(&mut self, buf: &mut CellBuffer, theme: &Theme) -> &mut Self {
        if let Some(hints) = self.footer_hints {
            let sep_y = self.modal.bottom().saturating_sub(3);
            let hints_y = self.modal.bottom().saturating_sub(2);
            let sep_style = Style::new().fg(theme.border_dim).bg(theme.background);
            let hint_style = Style::new().fg(theme.text_muted).bg(theme.background);
            for sx in (self.modal.x + 1)..(self.modal.right() - 1) {
                buf.put_char(sx, sep_y, '\u{2500}', sep_style);
            }
            buf.draw_str(self.inner_x, hints_y, hints, hint_style);
        }
        self
    }

    pub fn footer_custom(&self, buf: &mut CellBuffer, sep_y: u16, hints_y: u16, hints: &str, hint_style: Style, sep_style: Style) {
        for sx in (self.modal.x + 1)..(self.modal.right() - 1) {
            buf.put_char(sx, sep_y, '\u{2500}', sep_style);
        }
        buf.draw_str(self.inner_x, hints_y, hints, hint_style);
    }

    pub fn scrollable_lines(
        &mut self,
        buf: &mut CellBuffer,
        lines: &[(&str, Style)],
        scroll: usize,
        _theme: &Theme,
    ) -> &mut Self {
        for (i, (text, style)) in lines.iter().enumerate() {
            if i < scroll {
                continue;
            }
            if !self.has_room() {
                break;
            }
            buf.draw_str(self.inner_x, self.cursor_y, truncate_str(text, self.inner_w), *style);
            self.cursor_y = self.cursor_y.saturating_add(1);
        }
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn theme() -> Theme {
        Theme::default()
    }

    #[test]
    fn test_modal_layout_new() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        assert_eq!(layout.modal.width, 40);
        assert_eq!(layout.modal.height, 10);
        assert_eq!(layout.inner_x, layout.modal.x + 2);
        assert!(layout.inner_w > 0);
    }

    #[test]
    fn test_modal_layout_centering() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        assert_eq!(layout.modal.x, 20);
        assert_eq!(layout.modal.y, 7);
    }

    #[test]
    fn test_cursor_advances() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        let start_y = layout.cursor_y();
        layout.blank().blank().blank();
        assert_eq!(layout.cursor_y(), start_y + 3);
    }

    #[test]
    fn test_remaining_rows() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        let initial = layout.remaining_rows();
        layout.blank();
        assert_eq!(layout.remaining_rows(), initial - 1);
    }

    #[test]
    fn test_title_draws_text() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig {
                border: BorderKind::Square {
                    top: Style::new().fg(theme().primary),
                    bottom: Style::new().fg(theme().border),
                },
                close_hint: CloseHint::None,
                footer_hints: None,
            },
        );
        let y = layout.cursor_y();
        layout.title(&mut buf, "Hello", Style::new().fg(crate::renderer::Color::WHITE));
        assert_eq!(buf.get(layout.inner_x, y).unwrap().ch, 'H');
    }

    #[test]
    fn test_text_draws_and_advances() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        let y = layout.cursor_y();
        layout.text(&mut buf, "world", Style::new().fg(crate::renderer::Color::WHITE));
        assert_eq!(buf.get(layout.inner_x, y).unwrap().ch, 'w');
        assert_eq!(layout.cursor_y(), y + 1);
    }

    #[test]
    fn test_has_room_true_then_false() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            4,
            ModalConfig::default(),
        );
        assert!(layout.has_room());
        layout.blank().blank().blank();
        assert!(!layout.has_room());
    }

    #[test]
    fn test_text_skips_when_no_room() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            4,
            ModalConfig::default(),
        );
        layout.blank().blank().blank();
        assert!(!layout.has_room());
        let y_before = layout.cursor_y();
        layout.text(&mut buf, "overflow", Style::new().fg(crate::renderer::Color::WHITE));
        assert_eq!(layout.cursor_y(), y_before);
    }

    #[test]
    fn test_draw_item_unselected() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        let y = layout.cursor_y();
        layout.draw_item(&mut buf, "item1", false, &theme());
        assert_eq!(buf.get(layout.inner_x, y).unwrap().ch, 'i');
    }

    #[test]
    fn test_draw_item_selected() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        let y = layout.cursor_y();
        layout.draw_item(&mut buf, "item1", true, &theme());
        assert_eq!(buf.get(layout.inner_x, y).unwrap().style.attrs.bold, true);
    }

    #[test]
    fn test_collapsible_expanded() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        let header_y = layout.cursor_y();
        layout.collapsible(
            &mut buf,
            "Section",
            true,
            &theme(),
            |inner_layout, inner_buf| {
                inner_layout.text(inner_buf, "content", Style::new().fg(crate::renderer::Color::WHITE));
            },
        );
        assert_eq!(buf.get(layout.inner_x, header_y).unwrap().ch, 'S');
        assert_eq!(buf.get(layout.inner_x, header_y + 1).unwrap().ch, 'c');
    }

    #[test]
    fn test_collapsible_collapsed() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        let header_y = layout.cursor_y();
        layout.collapsible(
            &mut buf,
            "Section",
            false,
            &theme(),
            |inner_layout, inner_buf| {
                inner_layout.text(inner_buf, "content", Style::new().fg(crate::renderer::Color::WHITE));
            },
        );
        assert_eq!(buf.get(layout.inner_x, header_y).unwrap().ch, 'S');
        assert_eq!(layout.cursor_y(), header_y + 1);
    }

    #[test]
    fn test_footer_draws_when_hints_set() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig {
                border: BorderKind::Square {
                    top: Style::new().fg(theme().primary),
                    bottom: Style::new().fg(theme().border),
                },
                close_hint: CloseHint::Esc,
                footer_hints: Some("\u{2191}\u{2193} scroll  \u{21B5} select  Esc close"),
            },
        );
        layout.footer(&mut buf, &theme());
        let hints_y = layout.modal.bottom() - 2;
        assert_eq!(buf.get(layout.inner_x, hints_y).unwrap().ch, '\u{2191}');
    }

    #[test]
    fn test_no_footer_when_no_hints() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig {
                border: BorderKind::Square {
                    top: Style::new().fg(theme().primary),
                    bottom: Style::new().fg(theme().border),
                },
                close_hint: CloseHint::Esc,
                footer_hints: None,
            },
        );
        let before = layout.content_bottom;
        layout.footer(&mut buf, &theme());
        assert_eq!(layout.content_bottom, before);
    }

    #[test]
    fn test_rounded_border() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig {
                border: BorderKind::Rounded(Style::new().fg(theme().text_muted)),
                close_hint: CloseHint::Esc,
                footer_hints: None,
            },
        );
        assert_eq!(buf.get(layout.modal.x, layout.modal.y).unwrap().ch, '\u{256d}');
    }

    #[test]
    fn test_scrollable_lines() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            40,
            10,
            ModalConfig::default(),
        );
        let lines: Vec<(&str, Style)> = vec![
            ("line0", Style::new().fg(crate::renderer::Color::WHITE)),
            ("line1", Style::new().fg(crate::renderer::Color::WHITE)),
            ("line2", Style::new().fg(crate::renderer::Color::WHITE)),
        ];
        let start_y = layout.cursor_y();
        layout.scrollable_lines(&mut buf, &lines, 1, &theme());
        assert_eq!(buf.get(layout.inner_x, start_y).unwrap().ch, 'l');
        assert_eq!(layout.cursor_y(), start_y + 2);
    }

    #[test]
    fn test_small_terminal_no_panic() {
        let mut buf = CellBuffer::new(10, 3);
        let area = Rect::new(0, 0, 10, 3);
        let mut layout = ModalLayout::new(
            &mut buf,
            area,
            &theme(),
            10,
            3,
            ModalConfig::default(),
        );
        for _ in 0..20 {
            layout.text(&mut buf, "x", Style::new().fg(crate::renderer::Color::WHITE));
        }
        assert!(layout.cursor_y() <= layout.content_bottom);
    }
}
