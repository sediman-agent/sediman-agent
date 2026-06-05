use std::fmt::Write;
use sediman_tui_core::renderer::{CellBuffer, Rect, Style, TextAttributes, display_width};
use sediman_tui_core::component::{fill_row, draw_pill};
use crate::app::App;

use super::messages::format_elapsed_into;

pub fn render_title_bar(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;

    fill_row(buf, area.y, area.x, area.right(), Style::new().bg(t.background).fg(t.text));

    let mut tmp = String::with_capacity(64);

    if app.agent.running {
        write!(tmp, " {} ", app.spinner_char()).unwrap();
    }
    let logo = if tmp.is_empty() {
        String::from(" \u{25c6} OpenSkynet")
    } else {
        let mut logo_str = String::from(" \u{25c6} OpenSkynet");
        logo_str.push_str(&tmp);
        logo_str
    };
    buf.draw_str(area.x, area.y, &logo, Style::new()
        .fg(t.primary)
        .add_modifier(TextAttributes::bold()));

    let version_str: &'static str = concat!(" v", env!("CARGO_PKG_VERSION"));
    let vx = area.x + display_width(&logo);
    if vx < area.right() {
        buf.draw_str(vx, area.y, version_str, Style::new().fg(t.text_muted).bg(t.background));
    }

    let provider = &app.provider;
    let model = app.model.as_deref().unwrap_or("default");

    tmp.clear();
    if app.agent.running {
        format_elapsed_into(app.agent.start.elapsed().as_secs(), &mut tmp);
        write!(tmp, " ").unwrap();
    } else {
        tmp.push_str(" idle ");
    }
    let status_color = if app.agent.running { t.success } else { t.text_muted };

    let mut pill_buf = String::with_capacity(32);
    write!(pill_buf, " {} ", provider).unwrap();
    let provider_w = display_width(&pill_buf);
    let provider_pill = pill_buf.clone();

    pill_buf.clear();
    write!(pill_buf, " {} ", model).unwrap();
    let model_w = display_width(&pill_buf);
    let model_label = pill_buf;

    let sep = " \u{b7} ";
    let status = &tmp;

    let right_w = provider_w + model_w + display_width(sep) + display_width(status);
    let mut rx = area.right().saturating_sub(right_w);

    rx = draw_pill(buf, rx, area.y, &provider_pill, Style::new().bg(t.secondary).fg(t.background));
    rx = draw_pill(buf, rx, area.y, &model_label, Style::new().bg(t.background_darker).fg(t.text));
    rx = draw_pill(buf, rx, area.y, sep, Style::new().fg(t.border_dim).bg(t.background));
    rx = draw_pill(buf, rx, area.y, status, Style::new().fg(status_color).bg(t.background));

    if app.connection.reconnecting {
        let warn = " \u{26a0} reconnecting ";
        let wx = area.x + display_width(&logo) + display_width(version_str);
        if wx + display_width(warn) < rx {
            buf.draw_str(wx, area.y, warn, Style::new().fg(t.warning).bg(t.background).add_modifier(TextAttributes::bold()));
        }
    }
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

    #[test]
    fn test_title_bar_shows_provider() {
        let mut buf = CellBuffer::new(80, 1);
        let app = test_app();
        render_title_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        assert!(find_str(&buf, "test"), "should show provider name");
    }

    #[test]
    fn test_title_bar_shows_model() {
        let mut buf = CellBuffer::new(80, 1);
        let app = test_app();
        render_title_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        assert!(find_str(&buf, "gpt-4"), "should show model name");
    }

    #[test]
    fn test_title_bar_shows_idle_status() {
        let mut buf = CellBuffer::new(80, 1);
        let app = test_app();
        render_title_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        assert!(find_str(&buf, "idle"), "should show idle status when agent not running");
    }

    #[test]
    fn test_title_bar_shows_logo() {
        let mut buf = CellBuffer::new(80, 1);
        let app = test_app();
        render_title_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        assert!(find_str(&buf, "OpenSkynet"), "should show logo text");
    }

    #[test]
    fn test_title_bar_fills_row_with_background() {
        let mut buf = CellBuffer::new(80, 1);
        let app = test_app();
        render_title_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        let mut bg_count = 0;
        for x in 0..80u16 {
            if buf.get(x, 0).unwrap().style.bg.is_some() {
                bg_count += 1;
            }
        }
        assert!(bg_count > 60, "most cells should have background, got {}/80", bg_count);
    }
}
