#[cfg(test)]
mod tests {
    use crate::app::{App, AppModal, DoctorCheck, DoctorInstallState, DoctorStatus};
    use crate::update::modals::doctor::handle_doctor;
    use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
    use sediman_tui_core::event::AppEvent;

    fn create_test_app_with_doctor(num_checks: usize, cursor: usize, scroll: u16) -> App {
        let checks: Vec<DoctorCheck> = (0..num_checks)
            .map(|i| DoctorCheck {
                category: "Test".to_string(),
                name: format!("Check {}", i),
                status: DoctorStatus::Pass,
                message: format!("Check {} message", i),
                optional: false,
                install_cmd: None,
            })
            .collect();

        let mut app = App::new(
            "test".to_string(),
            Some("test".to_string()),
            None,
            true,
            sediman_tui_bridge::ApiClient::new("/tmp/test.sock"),
        );
        app.modals.active = Some(AppModal::Doctor {
            checks,
            cursor,
            scroll,
            install_state: DoctorInstallState::Idle,
            install_output: Vec::new(),
            filter: String::new(),
            search_active: false,
        });

        app
    }

    fn create_key_event(code: KeyCode) -> KeyEvent {
        KeyEvent {
            code,
            kind: KeyEventKind::Press,
            state: crossterm::event::KeyEventState::NONE,
            modifiers: KeyModifiers::empty(),
        }
    }

    fn make_event_tx() -> tokio::sync::mpsc::Sender<AppEvent> {
        let (tx, _rx) = tokio::sync::mpsc::channel(1024);
        tx
    }

    #[tokio::test]
    async fn test_doctor_scroll_down_keeps_cursor_visible() {
        let mut app = create_test_app_with_doctor(20, 0, 0);
        let tx = make_event_tx();

        for i in 0..15 {
            let event = create_key_event(KeyCode::Down);
            handle_doctor(&mut app, event, &tx).await;

            if let Some(AppModal::Doctor { ref cursor, ref scroll, .. }) = app.modals.active {
                let visible_start = *scroll as usize;
                let visible_end = (visible_start + 12).min(20);

                println!("Step {}: cursor={}, scroll={}, visible=[{}, {})", i, cursor, scroll, visible_start, visible_end);

                assert!(
                    *cursor >= visible_start && *cursor < visible_end,
                    "Cursor {} not visible! visible range: [{}, {}), scroll: {}",
                    cursor, visible_start, visible_end, scroll
                );
            }
        }

        if let Some(AppModal::Doctor { ref cursor, ref scroll, .. }) = app.modals.active {
            assert_eq!(*cursor, 15, "Cursor should be at position 15 after 15 Down presses");
            assert!(*scroll > 0, "Scroll should have incremented to keep cursor visible");
        }
    }

    #[tokio::test]
    async fn test_doctor_scroll_up_keeps_cursor_visible() {
        let mut app = create_test_app_with_doctor(20, 19, 8);
        let tx = make_event_tx();

        for i in 0..15 {
            let event = create_key_event(KeyCode::Up);
            handle_doctor(&mut app, event, &tx).await;

            if let Some(AppModal::Doctor { ref cursor, ref scroll, .. }) = app.modals.active {
                let visible_start = *scroll as usize;
                let visible_end = (visible_start + 12).min(20);

                println!("Step {}: cursor={}, scroll={}, visible=[{}, {})", i, cursor, scroll, visible_start, visible_end);

                assert!(
                    *cursor >= visible_start && *cursor < visible_end,
                    "Cursor {} not visible! visible range: [{}, {}), scroll: {}",
                    cursor, visible_start, visible_end, scroll
                );
            }
        }

        if let Some(AppModal::Doctor { ref cursor, ref scroll, .. }) = app.modals.active {
            assert_eq!(*cursor, 4, "Cursor should be at position 4 after 15 Up presses");
            assert!(*scroll < 8, "Scroll should have decremented to keep cursor visible");
        }
    }

    #[tokio::test]
    async fn test_doctor_scroll_at_boundary() {
        let mut app = create_test_app_with_doctor(20, 10, 0);
        let tx = make_event_tx();

        let event = create_key_event(KeyCode::Down);
        handle_doctor(&mut app, event, &tx).await;

        if let Some(AppModal::Doctor { ref cursor, ref scroll, .. }) = app.modals.active {
            println!("After pressing Down: cursor={}, scroll={}", cursor, scroll);
            let visible_start = *scroll as usize;
            let visible_end = (visible_start + 12).min(20);
            assert!(*cursor >= visible_start && *cursor < visible_end,
                "Cursor at boundary should still be visible");
        }
    }

    #[tokio::test]
    async fn test_doctor_no_scroll_when_not_needed() {
        let mut app = create_test_app_with_doctor(20, 5, 0);
        let tx = make_event_tx();
        let initial_scroll = if let Some(AppModal::Doctor { ref scroll, .. }) = app.modals.active {
            *scroll
        } else {
            panic!("No doctor modal active");
        };

        let event = create_key_event(KeyCode::Down);
        handle_doctor(&mut app, event, &tx).await;

        if let Some(AppModal::Doctor { ref cursor, ref scroll, .. }) = app.modals.active {
            assert_eq!(*cursor, 6, "Cursor should have moved");
            assert_eq!(*scroll, initial_scroll, "Scroll should not have changed");
        }
    }

    #[tokio::test]
    async fn test_doctor_enter_shows_confirm_for_installable() {
        let checks = vec![DoctorCheck {
            category: "Test".to_string(),
            name: "missing".to_string(),
            status: DoctorStatus::Fail,
            message: "not found".to_string(),
            optional: false,
            install_cmd: Some("echo hello".to_string()),
        }];
        let mut app = App::new(
            "test".to_string(),
            Some("test".to_string()),
            None,
            true,
            sediman_tui_bridge::ApiClient::new("/tmp/test.sock"),
        );
        app.modals.active = Some(AppModal::Doctor {
            checks,
            cursor: 0,
            scroll: 0,
            install_state: DoctorInstallState::Idle,
            install_output: Vec::new(),
            filter: String::new(),
            search_active: false,
        });
        let tx = make_event_tx();

        let event = create_key_event(KeyCode::Enter);
        handle_doctor(&mut app, event, &tx).await;

        if let Some(AppModal::Doctor { ref install_state, .. }) = app.modals.active {
            assert!(matches!(install_state, DoctorInstallState::Confirming { .. }),
                "Should be in Confirming state after Enter on installable check");
        }
    }

    #[tokio::test]
    async fn test_doctor_esc_cancels_confirm() {
        let checks = vec![DoctorCheck {
            category: "Test".to_string(),
            name: "missing".to_string(),
            status: DoctorStatus::Fail,
            message: "not found".to_string(),
            optional: false,
            install_cmd: Some("echo hello".to_string()),
        }];
        let mut app = App::new(
            "test".to_string(),
            Some("test".to_string()),
            None,
            true,
            sediman_tui_bridge::ApiClient::new("/tmp/test.sock"),
        );
        app.modals.active = Some(AppModal::Doctor {
            checks,
            cursor: 0,
            scroll: 0,
            install_state: DoctorInstallState::Confirming {
                cmd: "echo hello".to_string(),
                category: "Test".to_string(),
            },
            install_output: Vec::new(),
            filter: String::new(),
            search_active: false,
        });
        let tx = make_event_tx();

        let event = create_key_event(KeyCode::Esc);
        handle_doctor(&mut app, event, &tx).await;

        if let Some(AppModal::Doctor { ref install_state, .. }) = app.modals.active {
            assert_eq!(*install_state, DoctorInstallState::Idle,
                "Esc should cancel confirm back to Idle");
        }
    }

    #[tokio::test]
    async fn test_doctor_slash_enters_search() {
        let mut app = create_test_app_with_doctor(5, 0, 0);
        let tx = make_event_tx();

        let event = create_key_event(KeyCode::Char('/'));
        handle_doctor(&mut app, event, &tx).await;

        if let Some(AppModal::Doctor { ref search_active, .. }) = app.modals.active {
            assert!(*search_active, "/ should activate search");
        }
    }

    #[tokio::test]
    async fn test_doctor_search_types_and_esc_clears() {
        let mut app = create_test_app_with_doctor(5, 0, 0);
        let tx = make_event_tx();

        let slash = create_key_event(KeyCode::Char('/'));
        handle_doctor(&mut app, slash, &tx).await;

        let g = create_key_event(KeyCode::Char('g'));
        handle_doctor(&mut app, g, &tx).await;
        let i = create_key_event(KeyCode::Char('i'));
        handle_doctor(&mut app, i, &tx).await;

        if let Some(AppModal::Doctor { ref filter, ref search_active, .. }) = app.modals.active {
            assert_eq!(filter, "gi");
            assert!(*search_active);
        }

        let esc = create_key_event(KeyCode::Esc);
        handle_doctor(&mut app, esc, &tx).await;

        if let Some(AppModal::Doctor { ref filter, ref search_active, .. }) = app.modals.active {
            assert!(filter.is_empty(), "Esc should clear filter");
            assert!(!search_active, "Esc should deactivate search");
        }
    }
}
