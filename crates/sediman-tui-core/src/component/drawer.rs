use crate::renderer::{CellBuffer, Rect, Style, TextAttributes, display_width, truncate_str};
use crate::styling::Theme;

use super::block::{fill_area, fill_row};
use super::border::draw_border;
use super::input_row::{draw_input_row, InputRowConfig};
use super::list::ScrollableList;
use super::modal_layout::{CloseHint, ModalConfig};

pub struct DrawerFrame {
    pub rect: Rect,
    pub inner_x: u16,
    pub inner_w: usize,
    cursor_y: u16,
    content_top: u16,
    content_bottom: u16,
    footer_reserve: u16,
    footer_hints: Option<&'static str>,
}

impl DrawerFrame {
    pub fn new(
        buf: &mut CellBuffer,
        area: Rect,
        theme: &Theme,
        width: u16,
        max_rows: u16,
        config: ModalConfig,
    ) -> Self {
        let w = width.min(area.width);
        let h = max_rows.min(area.height);
        let rect = Rect::new(area.x, area.y, w, h);

        fill_area(buf, rect, Style::new().bg(theme.background).fg(theme.text));

        draw_border(
            buf,
            rect,
            Style::new().fg(theme.primary),
            Style::new().fg(theme.border),
        );

        let bottom_line_y = rect.bottom().saturating_sub(1);
        let sep_style = Style::new().fg(theme.primary).bg(theme.background);
        for sx in (rect.x + 1)..(rect.right() - 1) {
            buf.put_char(sx, bottom_line_y, '\u{2500}', sep_style);
        }

        if let CloseHint::None = config.close_hint {
        } else {
            let hint = config.close_hint.text();
            let hint_style = Style::new().fg(theme.text_muted).bg(theme.background);
            let x = rect.right().saturating_sub(display_width(hint) + 2);
            buf.draw_str(x, rect.y, hint, hint_style);
        }

        let footer_reserve = if config.footer_hints.is_some() { 3u16 } else { 0 };
        let content_top = rect.y + 1;
        let content_bottom = rect.bottom().saturating_sub(1 + footer_reserve);

        Self {
            rect,
            inner_x: rect.x + 2,
            inner_w: rect.width.saturating_sub(4) as usize,
            cursor_y: content_top,
            content_top,
            content_bottom,
            footer_reserve,
            footer_hints: config.footer_hints,
        }
    }

    pub fn cursor_y(&self) -> u16 {
        self.cursor_y
    }

    pub fn remaining_rows(&self) -> u16 {
        self.content_bottom.saturating_sub(self.cursor_y)
    }

    pub fn has_room(&self) -> bool {
        self.cursor_y < self.content_bottom
    }

    pub fn advance(&mut self, rows: u16) {
        self.cursor_y = self.cursor_y.saturating_add(rows);
    }

    pub fn title(&mut self, buf: &mut CellBuffer, text: &str, style: Style) -> &mut Self {
        buf.draw_str(self.rect.x + 2, self.cursor_y, text, style);
        self.cursor_y = self.cursor_y.saturating_add(1);
        self
    }

    pub fn separator(&mut self, buf: &mut CellBuffer, style: Style) -> &mut Self {
        for sx in (self.rect.x + 1)..(self.rect.right() - 1) {
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

    pub fn input_row(
        &mut self,
        buf: &mut CellBuffer,
        config: &InputRowConfig,
        theme: &Theme,
    ) -> &mut Self {
        if !self.has_room() {
            return self;
        }
        let input_x = self.rect.x + 1;
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
                self.rect.x + 1,
                self.rect.right() - 1,
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
        buf.put_char(
            self.inner_x + display_width(label) as u16 + 1,
            self.cursor_y,
            arrow,
            header_style,
        );
        self.cursor_y = self.cursor_y.saturating_add(1);

        if expanded {
            render_content(self, buf);
        }
        self
    }

    pub fn footer(&mut self, buf: &mut CellBuffer, theme: &Theme) -> &mut Self {
        if let Some(hints) = self.footer_hints {
            let sep_y = self.rect.bottom().saturating_sub(3);
            let hints_y = self.rect.bottom().saturating_sub(2);
            let sep_style = Style::new().fg(theme.border_dim).bg(theme.background);
            let hint_style = Style::new().fg(theme.text_muted).bg(theme.background);
            for sx in (self.rect.x + 1)..(self.rect.right() - 1) {
                buf.put_char(sx, sep_y, '\u{2500}', sep_style);
            }
            buf.draw_str(self.inner_x, hints_y, hints, hint_style);
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
    fn test_drawer_new() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let drawer = DrawerFrame::new(
            &mut buf,
            area,
            &theme(),
            60,
            10,
            ModalConfig::default(),
        );
        assert_eq!(drawer.rect.width, 60);
        assert_eq!(drawer.rect.height, 10);
        assert_eq!(drawer.rect.x, 0);
        assert_eq!(drawer.rect.y, 0);
    }

    #[test]
    fn test_drawer_clamps_to_area() {
        let mut buf = CellBuffer::new(40, 10);
        let area = Rect::new(0, 0, 40, 10);
        let drawer = DrawerFrame::new(
            &mut buf,
            area,
            &theme(),
            100,
            50,
            ModalConfig::default(),
        );
        assert_eq!(drawer.rect.width, 40);
        assert_eq!(drawer.rect.height, 10);
    }

    #[test]
    fn test_drawer_cursor_advances() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut drawer = DrawerFrame::new(
            &mut buf,
            area,
            &theme(),
            60,
            10,
            ModalConfig::default(),
        );
        let start_y = drawer.cursor_y();
        drawer.blank().blank();
        assert_eq!(drawer.cursor_y(), start_y + 2);
    }

    #[test]
    fn test_drawer_text_draws() {
        let mut buf = CellBuffer::new(80, 24);
        let area = Rect::new(0, 0, 80, 24);
        let mut drawer = DrawerFrame::new(
            &mut buf,
            area,
            &theme(),
            60,
            10,
            ModalConfig::default(),
        );
        let y = drawer.cursor_y();
        drawer.text(&mut buf, "hello", Style::new().fg(crate::renderer::Color::WHITE));
        assert_eq!(buf.get(drawer.inner_x, y).unwrap().ch, 'h');
    }
}
