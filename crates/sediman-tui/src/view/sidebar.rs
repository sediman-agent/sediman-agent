use std::fmt::Write;
use sediman_tui_core::renderer::{CellBuffer, Rect, Style, TextAttributes, display_width};
use sediman_tui_core::component::draw_separator;
use crate::app::{App, SideTab};

const MAX_ENTRY_DISPLAY: usize = 35;

pub fn render_side_panel(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let tab_labels: &[(&str, SideTab)] = &[
        ("Skills", SideTab::Skills),
        ("Memory", SideTab::Memory),
        ("Schedule", SideTab::Schedule),
        ("Status", SideTab::Status),
    ];

    let current = app.side_panel_tab;
    let content_area = Rect::new(area.x, area.y + 1, area.width, area.height.saturating_sub(1));

    draw_separator(buf, area.y, area.x, area.right(), Style::new().fg(t.border));

    let mut x = area.x;
    for (label, tab) in tab_labels {
        let active = *tab == current;
        let sep = if active { " \u{25b8} " } else { "   " };
        let style = if active {
            Style::new().fg(t.primary).add_modifier(TextAttributes::bold())
        } else {
            Style::new().fg(t.text_muted)
        };
        let full = format!("{}{}", sep, label);
        buf.draw_str_clipped(area, x, area.y, &full, style);
        x += display_width(&full) + 1;
    }

    let lines: Vec<(String, Style)> = match current {
        SideTab::Skills => render_list_tab("Skills", "/skills to load", &app.cache.skills, t),
        SideTab::Memory => render_list_tab("Memory", "/memory to load", &app.cache.memory, t),
        SideTab::Schedule => render_list_tab("Schedule", "/schedule to load", &app.cache.schedule, t),
        SideTab::Status => render_status_tab_inner(app),
    };

    for (i, (text, style)) in lines.iter().enumerate() {
        if i < app.side_panel_scroll {
            continue;
        }
        let y = content_area.y + (i - app.side_panel_scroll) as u16;
        if y >= content_area.bottom() {
            break;
        }
        buf.draw_str_clipped(content_area, content_area.x + 1, y, text, style.bg(t.background_panel));
    }
}

fn render_list_tab(title: &str, empty_hint: &str, cache: &[String], t: &sediman_tui_core::styling::Theme) -> Vec<(String, Style)> {
    let mut out = Vec::with_capacity(cache.len() + 3);
    out.push((String::new(), Style::new()));
    let mut s = String::with_capacity(64);
    write!(s, "  {}", title).unwrap();
    out.push((s, Style::new().fg(t.secondary).add_modifier(TextAttributes::bold())));

    if cache.is_empty() {
        out.push(("  none yet".into(), Style::new().fg(t.text_muted)));
        let mut s2 = String::with_capacity(64);
        write!(s2, "  \u{2502} {}", empty_hint).unwrap();
        out.push((s2, Style::new().fg(t.text_muted)));
    } else {
        let mut entry_buf = String::with_capacity(MAX_ENTRY_DISPLAY + 6);
        for entry in cache {
            entry_buf.clear();
            write!(entry_buf, "  \u{2022} ").unwrap();
            for ch in entry.chars().take(MAX_ENTRY_DISPLAY) {
                entry_buf.push(ch);
            }
            out.push((entry_buf.clone(), Style::new().fg(t.text)));
        }
    }
    out
}

fn render_status_tab_inner(app: &App) -> Vec<(String, Style)> {
    let t = &app.theme;
    let mode = app.permission.current_label();
    let agent_status = if app.agent.running { "running" } else { "idle" };
    let agent_style = if app.agent.running { Style::new().fg(t.success) } else { Style::new().fg(t.text_muted) };

    let mut s = String::with_capacity(64);
    let mut lines = Vec::with_capacity(8);
    lines.push((String::new(), Style::new()));
    lines.push(("  Status".into(), Style::new().fg(t.secondary).add_modifier(TextAttributes::bold())));
    lines.push((String::new(), Style::new()));
    s.clear(); write!(s, "  Model   {}", app.model.as_deref().unwrap_or("default")).unwrap();
    lines.push((s.clone(), Style::new().fg(t.text)));
    s.clear(); write!(s, "  Mode    {}", mode).unwrap();
    lines.push((s.clone(), Style::new().fg(t.text)));
    s.clear(); write!(s, "  Tasks   {}", app.agent.task_count).unwrap();
    lines.push((s.clone(), Style::new().fg(t.text)));
    s.clear(); write!(s, "  Browser {}", if app.headless { "headless" } else { "headed" }).unwrap();
    lines.push((s.clone(), Style::new().fg(t.text)));
    s.clear(); write!(s, "  Agent   {}", agent_status).unwrap();
    lines.push((s, agent_style));
    lines
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app::{App, SideTab};
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
    fn test_sidebar_shows_tab_labels() {
        let mut buf = CellBuffer::new(60, 24);
        let app = test_app();
        render_side_panel(&mut buf, Rect::new(0, 0, 60, 24), &app);
        assert!(find_str(&buf, "Skills"), "should show Skills tab");
        assert!(find_str(&buf, "Memory"), "should show Memory tab");
        assert!(find_str(&buf, "Schedule"), "should show Schedule tab");
        assert!(find_str(&buf, "Status"), "should show Status tab");
    }

    #[test]
    fn test_sidebar_active_tab_has_bold_label() {
        let mut buf = CellBuffer::new(60, 24);
        let app = test_app();
        render_side_panel(&mut buf, Rect::new(0, 0, 60, 24), &app);
        assert!(find_str(&buf, "Skills"), "active Skills tab should be rendered");
    }

    #[test]
    fn test_sidebar_empty_skills_shows_hint() {
        let mut buf = CellBuffer::new(40, 24);
        let mut app = test_app();
        app.side_panel_tab = SideTab::Skills;
        render_side_panel(&mut buf, Rect::new(0, 0, 40, 24), &app);
        assert!(find_str(&buf, "none yet"), "should show empty hint when cache is empty");
        assert!(find_str(&buf, "/skills to load"), "should show command hint");
    }

    #[test]
    fn test_sidebar_populated_cache_shows_entries() {
        let mut buf = CellBuffer::new(40, 24);
        let mut app = test_app();
        app.side_panel_tab = SideTab::Memory;
        app.cache.memory = vec!["entry-alpha".into(), "entry-beta".into()];
        render_side_panel(&mut buf, Rect::new(0, 0, 40, 24), &app);
        assert!(find_str(&buf, "entry-alpha"), "should show first cached item");
        assert!(find_str(&buf, "entry-beta"), "should show second cached item");
    }

    #[test]
    fn test_sidebar_status_tab_shows_info() {
        let mut buf = CellBuffer::new(40, 24);
        let mut app = test_app();
        app.side_panel_tab = SideTab::Status;
        render_side_panel(&mut buf, Rect::new(0, 0, 40, 24), &app);
        assert!(find_str(&buf, "Model"), "status tab should show Model label");
        assert!(find_str(&buf, "gpt-4"), "status tab should show model value");
        assert!(find_str(&buf, "Browser"), "status tab should show Browser label");
        assert!(find_str(&buf, "Agent"), "status tab should show Agent label");
        assert!(find_str(&buf, "idle"), "status tab should show idle when agent not running");
    }

    #[test]
    fn test_sidebar_status_shows_headless() {
        let mut buf = CellBuffer::new(40, 24);
        let mut app = test_app();
        app.side_panel_tab = SideTab::Status;
        app.headless = true;
        render_side_panel(&mut buf, Rect::new(0, 0, 40, 24), &app);
        assert!(find_str(&buf, "headless"), "should show headless browser status");
    }
}
