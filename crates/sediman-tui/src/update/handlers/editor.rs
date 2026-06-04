//! Non-modal key handling for the TUI (editor, navigation, search).

use crate::app::{App, ChatMessage};
use crossterm::event::{KeyCode, KeyModifiers};

/// Scroll up by a specified amount (show older content).
fn scroll_up(app: &mut App, amount: u16) {
    app.scroll_offset = app.scroll_offset.saturating_add(amount);
    app.auto_scroll = false;
    app.scroll_paused = true;
}

/// Scroll down by a specified amount (show newer content).
fn scroll_down(app: &mut App, amount: u16) {
    if app.scroll_offset <= amount {
        app.scroll_offset = 0;
        app.scroll_paused = false;
        app.auto_scroll = true;
    } else {
        app.scroll_offset = app.scroll_offset.saturating_sub(amount);
        app.auto_scroll = false;
    }
}

/// Handle non-modal keyboard input (editor, search, navigation).
pub fn handle_editor_key(app: &mut App, key: crossterm::event::KeyEvent) -> bool {
    // Esc: cancel search or clear input
    if key.code == KeyCode::Esc {
        if app.agent_running {
            app.interrupt.trigger();
            app.agent_running = false;
            app.append_step("-- Interrupted --".to_string());
        } else {
            app.editor.delete_line_by_head();
        }
        return true;
    }

    // Ctrl+C: clear input or cancel agent
    if key.code == KeyCode::Char('c') && key.modifiers.contains(KeyModifiers::CONTROL) {
        if app.agent_running {
            app.interrupt.trigger();
            app.agent_running = false;
            app.append_step("-- Cancelled --".to_string());
        } else {
            app.editor.delete_line_by_head();
        }
        return true;
    }

    // Ctrl+/ toggles help (same as OpenCode's ctrl+?)
    if key.code == KeyCode::Char('/') && key.modifiers.contains(KeyModifiers::CONTROL) {
        if matches!(app.active_modal, Some(crate::app::AppModal::Help { .. })) {
            app.active_modal = None;
        } else {
            app.active_modal = Some(crate::app::AppModal::Help { scroll: 0 });
        }
        return true;
    }

    // Ctrl+P: alias for help toggle
    if key.code == KeyCode::Char('p') && key.modifiers.contains(KeyModifiers::CONTROL) {
        if matches!(app.active_modal, Some(crate::app::AppModal::Help { .. })) {
            app.active_modal = None;
        } else {
            app.active_modal = Some(crate::app::AppModal::Help { scroll: 0 });
        }
        return true;
    }

    // Ctrl+R: reverse history search
    if key.code == KeyCode::Char('r') && key.modifiers.contains(KeyModifiers::CONTROL) {
        if app.editor.is_searching() {
            let query = app.editor.search_query().to_string();
            if !query.is_empty() {
                let query_lower = query.to_lowercase();
                let current_pos = app.editor.history_pos().unwrap_or(app.editor.history().len());
                if let Some((i, _entry)) = app.editor.history().iter().enumerate().rev()
                    .filter(|(i, _)| *i < current_pos)
                    .find(|(_, entry)| entry.to_lowercase().contains(&query_lower))
                {
                    app.editor.load_history_entry(i);
                }
            }
        } else {
            app.editor.start_history_search();
        }
        return true;
    }

    // Ctrl+L: clear input
    if key.code == KeyCode::Char('l') && key.modifiers.contains(KeyModifiers::CONTROL) {
        app.editor.delete_line_by_head();
        return true;
    }

    // Space bar when input is empty: toggle sections
    if key.code == KeyCode::Char(' ') {
        let is_empty = app.editor.lines().iter().all(|l| l.trim().is_empty());
        if is_empty && !app.editor.is_searching() {
            if app.agent_running {
                // Toggle inline sections during streaming: thinking → steps → reset
                let has_thinking = app.messages.last()
                    .map(|m| matches!(m, ChatMessage::Agent { thinking_text, .. } if !thinking_text.is_empty()))
                    .unwrap_or(false);
                if has_thinking && !app.steps_expanded {
                    app.toggle_steps_expanded();
                } else if app.thinking_expanded && app.steps_expanded {
                    app.toggle_thinking_expanded();
                } else if !app.thinking_expanded {
                    app.toggle_thinking_expanded();
                    app.steps_expanded = true;
                } else {
                    app.toggle_steps_expanded();
                }
                app.auto_scroll = true;
            } else if app.toggle_tab_expansion() {
                app.auto_scroll = true;
            }
            return true;
        }
    }

    // Left/Right arrows when input is empty: switch tabs (completed messages)
    if app.editor.lines().iter().all(|l| l.trim().is_empty()) && !app.editor.is_searching() {
        if key.code == KeyCode::Left {
            if app.switch_prev_tab() {
                app.auto_scroll = true;
            }
            return true;
        }
        if key.code == KeyCode::Right {
            if app.switch_next_tab() {
                app.auto_scroll = true;
            }
            return true;
        }
    }

    // Enter: submit (if not shift/ctrl modified and no completion selected)
    if key.code == KeyCode::Enter {
        let has_modifier = key.modifiers.contains(KeyModifiers::SHIFT)
            || key.modifiers.contains(KeyModifiers::CONTROL);
        if has_modifier {
            app.editor.input(key);
            return true;
        } else if let Some(cmd) = app.completer.selected_text() {
            app.editor.delete_line_by_head();
            app.editor.insert_str(cmd);
            app.completer.complete("");
            return true;
        }
        // Return false to allow submit logic to handle regular Enter
        return false;
    }

    // Tab: completion, section toggle (streaming), file complete, or agent mode switch
    if key.code == KeyCode::Tab {
        let prefix = app.editor.lines().join(" ").trim().to_string();
        if prefix.starts_with('/') {
            if let Some(selected) = app.completer.selected_text() {
                app.editor.delete_line_by_head();
                app.editor.insert_str(selected);
                app.completer.complete("");
            } else {
                app.completer.complete(&prefix);
                app.completer.next();
            }
        } else if app.agent_running {
            app.toggle_thinking_expanded();
        } else {
            // Try file path completion for the last word
            if let Some(last_word) = prefix.split_whitespace().last() {
                if (last_word.starts_with('@') || last_word.starts_with("./") || last_word.starts_with("~/") || last_word.starts_with('/'))
                    && complete_file_path(app, last_word) {
                    return true;
                }
            }
            app.cycle_agent_mode();
        }
        return true;
    }

    // Up: history up or scroll up
    if key.code == KeyCode::Up {
        let input = app.editor.lines().join(" ").trim().to_string();
        // Tab was just used: completion navigation
        if app.completer.filtered().len() > 1 && input.starts_with('/') && input.len() > 1 {
            app.completer.up();
        } else if key.modifiers.contains(KeyModifiers::CONTROL) {
            // Ctrl+Up: command history up
            app.editor.history_up();
        } else if input.is_empty() || key.modifiers.contains(KeyModifiers::SHIFT) {
            // Empty input or Shift+Up: scroll messages up
            scroll_up(app, 3);
        } else {
            // Has command input: history up
            app.editor.history_up();
        }
        return true;
    }

    // Down: history down or scroll down
    if key.code == KeyCode::Down {
        let input = app.editor.lines().join(" ").trim().to_string();
        // Tab was just used: completion navigation
        if app.completer.filtered().len() > 1 && input.starts_with('/') && input.len() > 1 {
            app.completer.down();
        } else if key.modifiers.contains(KeyModifiers::CONTROL) {
            // Ctrl+Down: command history down
            app.editor.history_down();
        } else if input.is_empty() || key.modifiers.contains(KeyModifiers::SHIFT) {
            // Empty input or Shift+Down: scroll messages down
            scroll_down(app, 3);
        } else {
            // Has command input: history down
            app.editor.history_down();
        }
        return true;
    }

    // PageUp/PageDown: scroll faster
    if key.code == KeyCode::PageUp {
        scroll_up(app, 20);
        return true;
    }
    if key.code == KeyCode::PageDown {
        scroll_down(app, 20);
        return true;
    }

    // Default: forward to editor
    if app.editor.is_searching() {
        match key.code {
            KeyCode::Char(c) => {
                if key.modifiers.contains(KeyModifiers::CONTROL) {
                    app.editor.cancel_history_search();
                } else {
                    app.editor.history_search_char(c);
                }
            }
            KeyCode::Backspace => {
                app.editor.history_search_backspace();
            }
            KeyCode::Enter | KeyCode::Esc => {
                app.editor.accept_history_search();
            }
            _ => {}
        }
        return true;
    }

    app.editor.input(key);

    // Update completions based on current input
    let current = app.editor.lines().join(" ").trim().to_string();
    if current.starts_with('/') {
        app.completer.complete(&current);
    } else {
        app.completer.complete("");
    }

    true
}

fn complete_file_path(app: &mut App, word: &str) -> bool {
    let expanded = if let Some(rest) = word.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            home.join(rest).to_string_lossy().to_string()
        } else {
            word.to_string()
        }
    } else {
        word.to_string()
    };
    let path = std::path::Path::new(&expanded);
    let (dir, file_prefix) = if expanded.ends_with('/') || expanded.ends_with(std::path::MAIN_SEPARATOR) {
        (path, "")
    } else {
        let dir = path.parent().unwrap_or(std::path::Path::new("."));
        let prefix = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        (dir, prefix)
    };

    let mut matches: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(file_prefix) && !name.starts_with('.') {
                let display = if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    format!("{}/", name)
                } else {
                    name
                };
                matches.push(display);
            }
        }
    }

    if matches.is_empty() {
        return false;
    }

    if matches.len() == 1 {
        let completion = &matches[0];
        let current = app.editor.lines().join(" ");
        let last = current.rsplit_once(|c: char| c.is_whitespace())
            .map(|(before, _)| format!("{} {}", before, completion))
            .unwrap_or_else(|| completion.clone());
        app.editor.delete_line_by_head();
        app.editor.insert_str(&last);
        return true;
    }

    app.completer.set_candidates(matches);
    let prefix = word.to_string();
    app.completer.complete(&prefix);
    if let Some(selected) = app.completer.selected_text() {
        let replacement = selected.to_string();
        let current = app.editor.lines().join(" ");
        let last = current.rsplit_once(|c: char| c.is_whitespace())
            .map(|(before, _)| format!("{} {}", before, replacement))
            .unwrap_or_else(|| replacement.clone());
        app.editor.delete_line_by_head();
        app.editor.insert_str(&last);
    }
    true
}

#[cfg(test)]
mod file_complete_tests {
    use super::*;
    use sediman_tui_bridge::ApiClient;

    fn make_app() -> App {
        App::new("test".into(), Some("gpt-4".into()), None, true, ApiClient::new("/tmp/test.sock"))
    }

    #[test]
    fn test_complete_file_path_nonexistent_dir() {
        let mut app = make_app();
        app.editor.insert_str("@/nonexistent_dir_12345/");
        let result = complete_file_path(&mut app, "@/nonexistent_dir_12345/");
        assert!(!result, "Should return false for nonexistent dir");
    }

    #[test]
    fn test_complete_file_path_cwd() {
        let mut app = make_app();
        app.editor.insert_str("./");
        let result = complete_file_path(&mut app, "./");
        assert!(result, "Should find files in cwd");
        let text = app.editor.lines().join(" ");
        assert!(!text.is_empty());
    }

    #[test]
    fn test_scroll_up_sets_paused() {
        let mut app = make_app();
        app.scroll_offset = 10;
        scroll_up(&mut app, 3);
        assert!(app.scroll_paused);
        assert_eq!(app.scroll_offset, 13);
    }

    #[test]
    fn test_scroll_down_to_bottom_resumes() {
        let mut app = make_app();
        app.scroll_offset = 3;
        app.scroll_paused = true;
        scroll_down(&mut app, 5);
        assert_eq!(app.scroll_offset, 0);
        assert!(!app.scroll_paused);
        assert!(app.auto_scroll);
    }

    #[test]
    fn test_scroll_down_partial_keeps_pause() {
        let mut app = make_app();
        app.scroll_offset = 10;
        app.scroll_paused = true;
        scroll_down(&mut app, 3);
        assert_eq!(app.scroll_offset, 7);
        assert!(!app.auto_scroll);
    }
}
