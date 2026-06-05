use std::fmt::Write;
use sediman_tui_core::renderer::{CellBuffer, Rect, Style, TextAttributes, display_width};
use sediman_tui_core::component::draw_separator;
use crate::app::{App, AgentMode};

pub fn render_input(buf: &mut CellBuffer, area: Rect, app: &mut App) {
    let t = &app.theme;

    let mode_color = match app.agent.mode {
        AgentMode::Manager => t.primary,
        AgentMode::Browser => t.success,
        AgentMode::Coder => t.warning,
        AgentMode::Terminator => t.error,
    };
    let mode_label = app.current_mode_label();

    let sep_y = area.y;
    draw_separator(buf, sep_y, area.x, area.right(), Style::new().fg(t.border_dim).bg(t.background));

    let x_left = area.x + 1;
    let x_right = area.right().saturating_sub(2);
    let border = Style::new().fg(t.border).bg(t.background);
    let panel = Style::new().bg(t.background).fg(t.text);

    // ── Row 1: Top border ╭──────────────────╮ ──
    let row_top = area.y + 1;
    buf.put_char(x_left, row_top, '\u{256d}', border);
    buf.put_char(x_right, row_top, '\u{256e}', border);
    for sx in (x_left + 1)..x_right {
        buf.put_char(sx, row_top, '\u{2500}', border);
    }

    // ── Rows 2..N-1: Input content (mode badge + editor) ──
    let row_bot = area.y + area.height.saturating_sub(1);
    let content_start = area.y + 2;
    let content_rows = row_bot.saturating_sub(content_start);

    // Fill all content rows with bg using a single fill call
    let content_fill = Rect::new(x_left + 1, content_start, x_right.saturating_sub(x_left + 1), content_rows);
    buf.fill(content_fill, sediman_tui_core::renderer::Cell::new(' ', panel));
    for row in content_start..row_bot {
        buf.put_char(x_left, row, '\u{2502}', Style::new().fg(mode_color).bg(t.background));
        buf.put_char(x_right, row, '\u{2502}', border);
    }

    // Mode badge on first content row
    let mut badge = String::with_capacity(16);
    write!(badge, " {} ", mode_label).unwrap();
    let badge_style = Style::new().bg(mode_color).fg(t.background).add_modifier(TextAttributes::bold());
    buf.draw_str(x_left + 2, content_start, &badge, badge_style);

    // Editor prompt
    let prompt = if app.agent.running { "\u{25cf} " } else { "\u{276f} " };
    app.editor.set_prompt(prompt);

    // Inner editor area: starts after badge on first row, full width on subsequent rows
    let badge_w = display_width(&badge) as u16;
    let inner_start = x_left + 2 + badge_w + 1;
    let inner_w = x_right.saturating_sub(inner_start);

    if inner_w > 0 && content_rows > 0 {
        let inner = Rect::new(inner_start, content_start, inner_w, content_rows);
        app.editor.render_into(buf, inner, &app.theme);
    }

    // ── Last row: Bottom border ╰──────────────────╯ + hints ──
    buf.put_char(x_left, row_bot, '\u{2570}', Style::new().fg(mode_color).bg(t.background));
    buf.put_char(x_right, row_bot, '\u{256f}', border);
    for sx in (x_left + 1)..x_right {
        buf.put_char(sx, row_bot, '\u{2500}', border);
    }

    let hint = if app.agent.running {
        " esc cancel"
    } else {
        " enter send \u{2502} tab mode \u{2502} / commands"
    };
    let hint_x = x_right.saturating_sub(display_width(hint) + 1);
    buf.draw_str(hint_x, row_bot, hint, Style::new().fg(t.text_muted).bg(t.background));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app::App;
    use sediman_tui_bridge::ApiClient;

    fn test_app() -> App {
        App::new("test".into(), Some("gpt-4".into()), None, true, ApiClient::new("/tmp/test_opencode.sock"))
    }

    fn find_str(buf: &CellBuffer, s: &str) -> bool {
        let chars: Vec<char> = s.chars().collect();
        if chars.is_empty() { return true; }
        'outer: for y in 0..buf.height() {
            for start_x in 0..buf.width() {
                let mut found = true;
                for (i, &expected) in chars.iter().enumerate() {
                    let x = start_x as usize + i;
                    if x >= buf.width() as usize { continue 'outer; }
                    match buf.get(x as u16, y) {
                        Some(cell) if cell.ch == expected => {}
                        _ => { found = false; break; }
                    }
                }
                if found { return true; }
            }
        }
        false
    }

    fn find_char(buf: &CellBuffer, ch: char) -> bool {
        for y in 0..buf.height() {
            for x in 0..buf.width() {
                if let Some(cell) = buf.get(x, y) {
                    if cell.ch == ch { return true; }
                }
            }
        }
        false
    }

    fn render_area() -> Rect {
        Rect::new(0, 0, 80, 10)
    }

    #[test]
    fn test_input_has_separator() {
        let mut buf = CellBuffer::new(80, 10);
        let mut app = test_app();
        render_input(&mut buf, render_area(), &mut app);
        assert!(find_char(&buf, '\u{2500}'), "Input should have separator row");
    }

    #[test]
    fn test_input_has_rounded_top_corners() {
        let mut buf = CellBuffer::new(80, 10);
        let mut app = test_app();
        render_input(&mut buf, render_area(), &mut app);
        assert!(find_char(&buf, '\u{256d}'), "Input should have top-left corner ╭");
        assert!(find_char(&buf, '\u{256e}'), "Input should have top-right corner ╮");
    }

    #[test]
    fn test_input_has_rounded_bottom_corners() {
        let mut buf = CellBuffer::new(80, 10);
        let mut app = test_app();
        render_input(&mut buf, render_area(), &mut app);
        assert!(find_char(&buf, '\u{2570}'), "Input should have bottom-left corner ╰");
        assert!(find_char(&buf, '\u{256f}'), "Input should have bottom-right corner ╯");
    }

    #[test]
    fn test_input_has_side_borders() {
        let mut buf = CellBuffer::new(80, 10);
        let mut app = test_app();
        render_input(&mut buf, render_area(), &mut app);
        assert!(find_char(&buf, '\u{2502}'), "Input should have vertical side borders │");
    }

    #[test]
    fn test_input_shows_idle_hints() {
        let mut buf = CellBuffer::new(80, 10);
        let mut app = test_app();
        assert!(!app.agent.running);
        render_input(&mut buf, render_area(), &mut app);
        assert!(find_str(&buf, "enter send"), "Idle input should show 'enter send' hint");
    }

    #[test]
    fn test_input_shows_running_hints() {
        let mut buf = CellBuffer::new(80, 10);
        let mut app = test_app();
        app.agent.running = true;
        render_input(&mut buf, render_area(), &mut app);
        assert!(find_str(&buf, "esc cancel"), "Running input should show 'esc cancel' hint");
    }

    #[test]
    fn test_input_shows_mode_badge() {
        let mut buf = CellBuffer::new(80, 10);
        let mut app = test_app();
        app.agent.current_mode_index = 1;
        app.sync_agent_mode();
        render_input(&mut buf, render_area(), &mut app);
        let label = app.current_mode_label();
        assert!(find_str(&buf, label), "Input should show mode badge '{}'", label);
    }

    #[test]
    fn test_input_renders_editor_content() {
        let mut buf = CellBuffer::new(80, 10);
        let mut app = test_app();
        app.editor.insert_str("hello world");
        render_input(&mut buf, render_area(), &mut app);
        assert!(find_str(&buf, "hello"), "Input should render editor content");
    }

    #[test]
    fn test_input_mode_changes_badge_color() {
        let mut buf1 = CellBuffer::new(80, 10);
        let mut buf2 = CellBuffer::new(80, 10);
        let mut app1 = test_app();
        let mut app2 = test_app();
        app2.agent.current_mode_index = 3;
        app2.sync_agent_mode();
        render_input(&mut buf1, render_area(), &mut app1);
        render_input(&mut buf2, render_area(), &mut app2);
        let t = &app1.theme;
        assert!(find_str(&buf1, "Mgr"), "Manager mode badge");
        assert!(find_str(&buf2, "Term"), "Terminator mode badge");
        let has_manager_color = (0..80u16).any(|x| buf1.get(x, 3).map_or(false, |c| c.style.fg == Some(t.primary)));
        let has_terminator_color = (0..80u16).any(|x| buf2.get(x, 3).map_or(false, |c| c.style.fg == Some(t.error)));
        assert!(has_manager_color, "Manager mode should use primary color for left border");
        assert!(has_terminator_color, "Terminator mode should use error color for left border");
    }
}
