use sediman_tui_core::command::{Command, CommandCategory};
use sediman_tui_core::event::AppEvent;

use crate::app::App;

pub async fn handle_terminator(app: &mut App, args: &str) {
    let task = args.trim();
    if task.is_empty() {
        app.add_system_message("Usage: /terminator <task description>".into());
        app.add_system_message("Launches the autonomous Terminator workflow to handle multi-issue tasks.".into());
        return;
    }

    app.agent_running = true;
    app.step_log.clear();
    app.spinner_text = "Terminator starting...".into();
    app.streaming_text.clear();
    app.streaming_phase.clear();
    app.start_agent_message(task);

    app.append_step("◆ Terminator mode activated".into());

    let bridge_url = app.bridge_url().to_string();
    let task_owned = task.to_string();
    let tx = app.event_tx.clone();
    let _interrupt_flag = app.interrupt.flag().clone();

    if let Some(ref tx) = tx {
        let _ = tx.send(AppEvent::AgentStep("terminator".into(), "◆ Terminator mode activated".into()));
    }

    tokio::spawn(async move {
        let client = sediman_tui_bridge::ApiClient::new(&bridge_url);
        let start = std::time::Instant::now();
        match client.run_terminator(&task_owned).await {
            Ok(result) => {
                let elapsed = start.elapsed().as_secs();
                let success = result.success;
                let result_text = if result.result.is_empty() {
                    "Terminator completed.".into()
                } else {
                    result.result
                };
                if let Some(ref tx) = tx {
                    for line in result_text.lines() {
                        let _ = tx.send(AppEvent::AgentStep("terminator".into(), line.to_string()));
                    }
                    let _ = tx.send(AppEvent::AgentResult(success, result_text, elapsed));
                    let _ = tx.send(AppEvent::AgentDone);
                    let icon = if success { "✓" } else { "✗" };
                    let _ = tx.send(AppEvent::CommandOutput(format!(
                        "{} Terminator finished ({})",
                        icon,
                        if elapsed >= 60 {
                            format!("{}m {}s", elapsed / 60, elapsed % 60)
                        } else {
                            format!("{}s", elapsed)
                        }
                    )));
                }
            }
            Err(e) => {
                if let Some(ref tx) = tx {
                    let _ = tx.send(AppEvent::AgentError(format!("Terminator error: {}", e)));
                    let _ = tx.send(AppEvent::AgentDone);
                }
            }
        }
    });
}

pub static CMD_TERMINATOR: Command = Command {
    name: "/terminator",
    aliases: &[],
    description: "Run autonomous Terminator workflow for multi-issue tasks",
    category: CommandCategory::Agent,
};
