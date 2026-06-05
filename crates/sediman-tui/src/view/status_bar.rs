use std::fmt::Write;
use sediman_tui_core::renderer::{CellBuffer, Rect, Style, display_width};
use sediman_tui_core::component::{fill_row, draw_pill};
use crate::app::App;

use super::messages::format_elapsed_into;

pub fn render_status_bar(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let y = area.y;

    fill_row(buf, y, area.x, area.right(), Style::new().bg(t.background_panel).fg(t.text));

    let mut x = area.x;
    let mut pill = String::with_capacity(32);
    let mut elapsed_buf = String::with_capacity(16);

    if app.agent.running {
        format_elapsed_into(app.agent.start.elapsed().as_secs(), &mut elapsed_buf);
        pill.clear();
        write!(pill, " \u{25cf} {} ", elapsed_buf).unwrap();
        x = draw_pill(buf, x, y, &pill, Style::new().bg(t.primary).fg(t.background_darker));

        if !app.agent.streaming_phase.is_empty() {
            let (phase_label, phase_color) = match app.agent.streaming_phase.as_str() {
                "thinking" => ("thinking", t.warning),
                "planning" => ("planning", t.info),
                "executing" => ("executing", t.primary),
                "observing" => ("observing", t.primary),
                "reflecting" => ("reflecting", t.warning),
                "responding" => ("responding", t.success),
                "retrying" => ("retrying", t.error),
                _ => ("", t.text),
            };
            if !phase_label.is_empty() {
                pill.clear();
                write!(pill, " {} ", phase_label).unwrap();
                x = draw_pill(buf, x, y, &pill, Style::new().bg(phase_color).fg(t.background_darker));
            }
        }

        if let (Some(attempt), Some(max), Some(countdown)) = (app.agent.retry_attempt, app.agent.retry_max, app.agent.retry_countdown) {
            if countdown > 0.0 {
                pill.clear();
                write!(pill, " ⟳ ({}/{}) {:.1}s ", attempt, max, countdown).unwrap();
                x = draw_pill(buf, x, y, &pill, Style::new().bg(t.error).fg(t.background_darker));
            }
        }

        if let Some(confidence) = app.agent.validation_confidence {
            let conf_color = if confidence >= 0.8 {
                t.success
            } else if confidence >= 0.5 {
                t.warning
            } else {
                t.error
            };
            pill.clear();
            write!(pill, " {:.0}% ", confidence * 100.0).unwrap();
            x = draw_pill(buf, x, y, &pill, Style::new().bg(conf_color).fg(t.background_darker));
        }

        if let Some(issues) = app.agent.validation_issues {
            if issues > 0 {
                pill.clear();
                write!(pill, " ⚠ {} ", issues).unwrap();
                x = draw_pill(buf, x, y, &pill, Style::new().bg(t.warning).fg(t.background_darker));
            }
        }
    } else if app.agent.task_count > 0 {
        pill.clear();
        write!(pill, " {} ", app.agent.task_count).unwrap();
        x = draw_pill(buf, x, y, &pill, Style::new().bg(t.background_darker).fg(t.text_muted));
    }

    let mode = app.permission.current_label();
    let mode_color = match mode {
        "acceptEdits" => t.success,
        "plan" => t.info,
        "auto" => t.error,
        _ => t.text,
    };
    pill.clear();
    write!(pill, " {} ", mode).unwrap();
    x = draw_pill(buf, x, y, &pill, Style::new().bg(mode_color).fg(t.background_darker));

    let model = app.model.as_deref().unwrap_or("default");
    pill.clear();
    write!(pill, " {} ", model).unwrap();
    let model_x = area.right().saturating_sub(display_width(&pill));
    if model_x > x + 2 {
        buf.draw_str(model_x, y, &pill, Style::new().bg(t.background_darker).fg(t.text_muted));
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
    fn test_status_bar_shows_model() {
        let mut buf = CellBuffer::new(80, 1);
        let app = test_app();
        render_status_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        assert!(find_str(&buf, "gpt-4"), "should show model name on right side");
    }

    #[test]
    fn test_status_bar_shows_mode_label() {
        let mut buf = CellBuffer::new(80, 1);
        let app = test_app();
        render_status_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        let mode = app.permission.current_label();
        assert!(find_str(&buf, mode), "should show permission mode label");
    }

    #[test]
    fn test_status_bar_fills_row_with_background() {
        let mut buf = CellBuffer::new(80, 1);
        let app = test_app();
        render_status_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        for x in 0..80u16 {
            let cell = buf.get(x, 0).unwrap();
            assert!(cell.style.bg.is_some(), "cell at x={} should have background", x);
        }
    }

    #[test]
    fn test_status_bar_shows_task_count_when_not_running() {
        let mut buf = CellBuffer::new(80, 1);
        let mut app = test_app();
        app.agent.running = false;
        app.agent.task_count = 5;
        render_status_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        assert!(find_str(&buf, "5"), "should show task count pill");
    }

    #[test]
    fn test_status_bar_agent_running_shows_elapsed() {
        let mut buf = CellBuffer::new(80, 1);
        let mut app = test_app();
        app.agent.running = true;
        app.agent.start = std::time::Instant::now();
        render_status_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        assert!(find_char(&buf, '\u{25cf}'), "should show bullet when agent running");
    }

    #[test]
    fn test_status_bar_shows_streaming_phase() {
        let mut buf = CellBuffer::new(80, 1);
        let mut app = test_app();
        app.agent.running = true;
        app.agent.start = std::time::Instant::now();
        app.agent.streaming_phase = "thinking".into();
        render_status_bar(&mut buf, Rect::new(0, 0, 80, 1), &app);
        assert!(find_str(&buf, "thinking"), "should show streaming phase label");
    }
}
