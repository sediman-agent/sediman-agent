use crate::app::{App, AppModal, DoctorInstallState};
use crate::error::try_send;
use crossterm::event::{KeyCode, KeyModifiers};
use sediman_tui_core::event::AppEvent;

pub async fn handle_doctor(app: &mut App, key: crossterm::event::KeyEvent, event_tx: &tokio::sync::mpsc::Sender<AppEvent>) -> bool {
    let search_active = if let Some(AppModal::Doctor { search_active, .. }) = &app.modals.active {
        search_active
    } else {
        return false;
    };

    if *search_active {
        return handle_search_input(app, key);
    }

    match key.code {
        KeyCode::Esc | KeyCode::Char('q') => {
            if let Some(AppModal::Doctor { ref mut install_state, .. }) = app.modals.active {
                if *install_state != DoctorInstallState::Idle {
                    *install_state = DoctorInstallState::Idle;
                    return true;
                }
            }
            app.modals.active = None;
            true
        }
        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.modals.active = None;
            true
        }
        KeyCode::Char('/') => {
            if let Some(AppModal::Doctor { ref mut search_active, .. }) = app.modals.active {
                *search_active = true;
            }
            true
        }
        KeyCode::Up | KeyCode::Char('k') => {
            if let Some(AppModal::Doctor { ref checks, ref mut cursor, ref mut scroll, ref filter, ref install_state, .. }) = app.modals.active {
                if *install_state != DoctorInstallState::Idle {
                    return true;
                }
                let filtered = filtered_indices(checks, filter);
                let pos = filtered.iter().position(|&idx| idx == *cursor).unwrap_or(0);
                if pos > 0 {
                    *cursor = filtered[pos - 1];
                    if *scroll > *cursor as u16 {
                        *scroll = *cursor as u16;
                    }
                }
            }
            true
        }
        KeyCode::Down | KeyCode::Char('j') => {
            if let Some(AppModal::Doctor { ref checks, ref mut cursor, ref mut scroll, ref filter, ref install_state, .. }) = app.modals.active {
                if *install_state != DoctorInstallState::Idle {
                    return true;
                }
                let filtered = filtered_indices(checks, filter);
                let pos = filtered.iter().position(|&idx| idx == *cursor).unwrap_or(0);
                if pos + 1 < filtered.len() {
                    *cursor = filtered[pos + 1];
                    const EDGE_OFFSET: usize = 8;
                    if *cursor >= EDGE_OFFSET {
                        let target_scroll = (*cursor as u16).saturating_sub(EDGE_OFFSET as u16 - 2);
                        if *scroll < target_scroll {
                            *scroll = target_scroll;
                        }
                    }
                }
            }
            true
        }
        KeyCode::Char('r') => {
            let checks = crate::commands::doctor::run_all_checks(app).await;
            let filter = if let Some(AppModal::Doctor { ref filter, .. }) = app.modals.active {
                filter.clone()
            } else {
                String::new()
            };
            app.modals.active = Some(AppModal::Doctor {
                checks,
                cursor: 0,
                scroll: 0,
                install_state: DoctorInstallState::Idle,
                install_output: Vec::new(),
                filter,
                search_active: false,
            });
            true
        }
        KeyCode::Enter => {
            if let Some(AppModal::Doctor { ref checks, ref mut cursor, ref mut install_state, ref mut install_output, .. }) = app.modals.active {
                match install_state.clone() {
                    DoctorInstallState::Idle => {
                        if let Some(cmd) = checks.get(*cursor).and_then(|c| c.install_cmd.clone()) {
                            let category = checks[*cursor].category.clone();
                            *install_state = DoctorInstallState::Confirming { cmd, category };
                        }
                    }
                    DoctorInstallState::Confirming { cmd, category } => {
                        *install_state = DoctorInstallState::Running { category: category.clone() };
                        install_output.clear();
                        install_output.push(format!("  Running: {}", cmd));

                        let tx = event_tx.clone();
                        tokio::spawn(async move {
                            let mut child = match tokio::process::Command::new("sh")
                                .arg("-c")
                                .arg(&cmd)
                                .stdout(std::process::Stdio::piped())
                                .stderr(std::process::Stdio::piped())
                                .spawn()
                            {
                                Ok(c) => c,
                                Err(e) => {
                                    try_send(&tx, AppEvent::DoctorInstallOutput(format!("  Failed: {}", e)));
                                    try_send(&tx, AppEvent::DoctorInstallDone {
                                        category,
                                        success: false,
                                    });
                                    return;
                                }
                            };

                            use tokio::io::{AsyncBufReadExt, BufReader};

                            let stdout = child.stdout.take();
                            let stderr = child.stderr.take();

                            if let Some(out) = stdout {
                                let reader = BufReader::new(out);
                                let mut lines = reader.lines();
                                loop {
                                    match lines.next_line().await {
                                        Ok(Some(line)) => {
                                            try_send(&tx, AppEvent::DoctorInstallOutput(format!("  {}", line)));
                                        }
                                        Ok(None) => break,
                                        Err(_) => break,
                                    }
                                }
                            }

                            if let Some(err) = stderr {
                                let reader = BufReader::new(err);
                                let mut lines = reader.lines();
                                loop {
                                    match lines.next_line().await {
                                        Ok(Some(line)) => {
                                            try_send(&tx, AppEvent::DoctorInstallOutput(format!("  {}", line)));
                                        }
                                        Ok(None) => break,
                                        Err(_) => break,
                                    }
                                }
                            }

                            let status = child.wait().await;
                            let success = status.as_ref().map(|s| s.success()).unwrap_or(false);
                            if success {
                                try_send(&tx, AppEvent::DoctorInstallOutput("  Done - re-checking...".into()));
                            } else {
                                let code = status.ok().and_then(|s| s.code()).unwrap_or(-1);
                                try_send(&tx, AppEvent::DoctorInstallOutput(format!("  Exit code: {}", code)));
                            }
                            try_send(&tx, AppEvent::DoctorInstallDone {
                                category,
                                success,
                            });
                        });
                    }
                    DoctorInstallState::Running { .. } => {}
                }
            }
            true
        }
        _ => false,
    }
}

fn handle_search_input(app: &mut App, key: crossterm::event::KeyEvent) -> bool {
    match key.code {
        KeyCode::Esc => {
            if let Some(AppModal::Doctor { ref mut search_active, ref mut filter, .. }) = app.modals.active {
                filter.clear();
                *search_active = false;
            }
            true
        }
        KeyCode::Enter => {
            if let Some(AppModal::Doctor { ref mut search_active, .. }) = app.modals.active {
                *search_active = false;
            }
            true
        }
        KeyCode::Backspace => {
            if let Some(AppModal::Doctor { ref mut filter, ref mut cursor, .. }) = app.modals.active {
                filter.pop();
                *cursor = 0;
            }
            true
        }
        KeyCode::Char(c) => {
            if let Some(AppModal::Doctor { ref mut filter, ref mut cursor, .. }) = app.modals.active {
                filter.push(c);
                *cursor = 0;
            }
            true
        }
        _ => true,
    }
}

pub fn filtered_indices(checks: &[crate::app::DoctorCheck], filter: &str) -> Vec<usize> {
    if filter.is_empty() {
        (0..checks.len()).collect()
    } else {
        let lower = filter.to_lowercase();
        checks
            .iter()
            .enumerate()
            .filter(|(_, c)| {
                c.name.to_lowercase().contains(&lower)
                    || c.category.to_lowercase().contains(&lower)
                    || c.message.to_lowercase().contains(&lower)
            })
            .map(|(i, _)| i)
            .collect()
    }
}

#[cfg(test)]
mod tests;
