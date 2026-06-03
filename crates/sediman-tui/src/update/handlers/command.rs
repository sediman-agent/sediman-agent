//! Slash command execution handler.

use crate::app::App;

/// Execute a slash command.
pub async fn handle_slash(app: &mut App, input: &str) {
    let (cmd, rest) = parse_command(input);

    match cmd {
        // Core commands
        "help" | "h" => {
            app.active_modal = Some(crate::app::AppModal::Help { scroll: 0 });
        }
        "exit" | "quit" | "q" => {
            app.running = false;
        }
        "clear" => {
            app.messages.clear();
            app.add_system_message("Messages cleared.".into());
        }
        "reset" => {
            app.messages.clear();
            app.step_log.clear();
            app.agent_running = false;
            app.add_system_message("Reset complete.".into());
        }
        "status" => {
            let status = format!(
                "Provider: {}\nModel: {}\nTasks completed: {}\nAgent running: {}\nMessages: {}",
                app.provider,
                app.model.as_deref().unwrap_or("default"),
                app.task_count,
                app.agent_running,
                app.messages.len()
            );
            app.add_system_message(status);
        }
        "compress" => {
            if app.messages.len() > 1 {
                // Compress old messages (keep last 10)
                let compressed_count = app.messages.len().saturating_sub(10);
                app.messages = app.messages.split_off(app.messages.len().saturating_sub(10));
                app.add_system_message(format!("Compressed {} old messages.", compressed_count));
            } else {
                app.add_system_message("Not enough messages to compress.".into());
            }
        }

        // Agent commands
        "models" | "model" => {
            app.open_model_dialog();
        }
        "provider" => {
            app.active_modal = Some(crate::app::AppModal::ProviderPicker);
        }
        "soul" => {
            crate::commands::soul::handle_soul(app, rest).await;
        }
        "themes" => {
            app.active_modal = Some(crate::app::AppModal::ThemePicker);
        }
        "coder" => {
            app.active_modal = Some(crate::app::AppModal::CoderPicker);
        }

        // Skills
        "skills" | "skill" => {
            app.active_modal = Some(crate::app::AppModal::SkillBrowser);
        }

        // Memory
        "memory" => {
            crate::commands::memory::handle_memory(app, rest).await;
        }
        "remember" => {
            crate::commands::memory::handle_remember(app, rest).await;
        }

        // Schedule
        "schedule" => {
            app.active_modal = Some(crate::app::AppModal::ScheduleBrowser);
        }

        // Sessions
        "sessions" => {
            app.active_modal = Some(crate::app::AppModal::SessionBrowser);
        }

        // Browser
        "browser" => {
            crate::commands::browser::handle_browser(app, rest).await;
        }

        // Tasks
        "delegate" => {
            app.add_system_message("Delegation feature - use /delegate <task> to delegate tasks".into());
        }

        // Integrations
        "connect" => {
            app.active_modal = Some(crate::app::AppModal::ConnectPicker);
        }

        // Checkpoint
        "checkpoint" => {
            app.add_system_message("Checkpoint feature - use /checkpoint <command> to manage checkpoints".into());
        }

        // Utilities
        "doctor" => {
            crate::commands::doctor::handle_doctor(app, "").await;
        }

        _ => {
            app.add_error_message(format!("Unknown command: /{}", cmd));
        }
    }
}

/// Parse a command string into (command, args).
fn parse_command(input: &str) -> (&str, &str) {
    let input = input.trim_start_matches('/');
    let parts: Vec<&str> = input.splitn(2, ' ').collect();
    if parts.len() >= 2 {
        (parts[0], parts[1])
    } else {
        (input, "")
    }
}
