use sediman_tui_core::renderer::{CellBuffer, Rect, Style, TextAttributes, display_width, truncate_str};
use sediman_tui_core::component::{
    ModalLayout, ModalConfig, BorderKind, CloseHint,
    InputRowConfig, fill_area,
};
use crate::app::{App, AppModal, ModalLineStyle};
use crate::constants::*;

pub fn render_help_modal(buf: &mut CellBuffer, area: Rect, app: &App, scroll: usize) {
    let t = &app.theme;

    let modal_w = ((area.width as f32 * MODAL_WIDTH_RATIO) as u16).clamp(MODAL_MIN_WIDTH, MODAL_MAX_WIDTH);
    let modal_h = ((area.height as f32 * MODAL_HEIGHT_RATIO) as u16).clamp(MODAL_MIN_HEIGHT, MODAL_MAX_HEIGHT);

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Q,
        footer_hints: None,
    });

    let title_display = " Commands Reference ";
    layout.title(buf, title_display, Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    let categories: &[(&str, &[(&str, &str)])] = &[
        ("General", &[
            ("/help", "Show this help dialog"),
            ("/exit", "Quit OpenSkynet"),
            ("/status", "Show connection & session status"),
            ("/clear", "Clear conversation history"),
            ("/reset", "Full reset \u{2014} clear everything"),
        ]),
        ("Agent", &[
            ("/models", "Search and select AI models"),
            ("/provider", "Connect provider (enter API key)"),
            ("/plan", "Toggle plan-only mode"),
            ("/compress", "Compress conversation context"),
            ("/soul", "Edit agent personality"),
            ("/coder", "Set coder backend"),
        ]),
        ("Skills", &[
            ("/skills", "List & search learned skills"),
            ("/skills run <name>", "Execute a skill"),
            ("/skills search <q>", "Search hub skills"),
        ]),
        ("Integrations", &[
            ("/connect", "Connect integration platforms"),
            ("/connect discord <token>", "Configure Discord bot"),
            ("/connect telegram <token>", "Configure Telegram bot"),
            ("/connect slack <token>", "Configure Slack bot"),
            ("/connect whatsapp <token>", "Configure WhatsApp bot"),
            ("/connect lark <id> <secret>", "Configure Lark bot"),
            ("/connect wechat <account>", "Configure WeChat bot"),
        ]),
        ("Browser", &[
            ("/browser", "Toggle headless/headed mode"),
        ]),
        ("Sessions", &[
            ("/sessions", "List & manage saved sessions"),
            ("/memory", "View & edit agent memory"),
            ("/remember <text>", "Save to agent memory"),
        ]),
        ("Schedule", &[
            ("/schedule", "List & manage scheduled jobs"),
        ]),
        ("Tasks", &[
            ("/delegate <task>", "Spawn a sub-agent task"),
            ("/parallel <a|b>", "Run tasks in parallel"),
        ]),
        ("Checkpoint", &[
            ("/checkpoint", "List filesystem checkpoints"),
            ("/checkpoint-create <dir>", "Create a checkpoint"),
            ("/rewind <id>", "Revert to checkpoint"),
            ("/branch <name>", "Create named branch"),
        ]),
        ("Utilities", &[
            ("/themes", "Browse & apply color themes"),
            ("/doctor", "Diagnose & install dependencies"),
        ]),
    ];

    let cmd_style = Style::new().fg(t.primary).bg(t.background);
    let desc_style = Style::new().fg(t.text_muted).bg(t.background);
    let cat_style = Style::new().fg(t.accent).bg(t.background).add_modifier(TextAttributes::bold());

    let mut line_idx = 0usize;

    for (category, cmds) in categories {
        if !layout.has_room() { break; }
        if line_idx >= scroll {
            buf.draw_str(layout.inner_x, layout.cursor_y(), category, cat_style);
            layout.advance(1);
        }
        line_idx += 1;
        for (cmd, desc) in *cmds {
            if !layout.has_room() { break; }
            if line_idx >= scroll {
                let cmd_display = truncate_str(cmd, 22);
                buf.draw_str(layout.inner_x + 1, layout.cursor_y(), cmd_display, cmd_style);
                let desc_x = layout.inner_x + 24;
                if desc_x < layout.modal.right() - 2 {
                    let max_desc = layout.inner_w.saturating_sub(MODAL_HELP_DESC_MAX_SUBTRACT);
                    let desc_display = truncate_str(desc, max_desc);
                    buf.draw_str(desc_x, layout.cursor_y(), desc_display, desc_style);
                }
                layout.advance(1);
            }
            line_idx += 1;
        }
        if line_idx >= scroll {
            layout.advance(1);
        }
    }
}

pub fn render_info_modal(
    buf: &mut CellBuffer,
    area: Rect,
    app: &App,
    title: &str,
    lines: &[crate::app::ModalLine],
    scroll: u16,
) {
    let t = &app.theme;

    let line_count = lines.len() as u16;
    let modal_w = ((area.width as f32 * MODAL_WIDTH_RATIO) as u16).clamp(MODAL_MIN_WIDTH, MODAL_MAX_WIDTH);
    let content_h = line_count.min(area.height.saturating_sub(4));
    let modal_h = content_h + 4;

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.primary) },
        close_hint: CloseHint::Q,
        footer_hints: None,
    });

    let title_display = format!(" {} ", title);
    layout.title(buf, &title_display, Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    layout.advance(1);

    let scroll = scroll as usize;
    for (i, line) in lines.iter().enumerate() {
        if i < scroll { continue; }
        if !layout.has_room() { break; }

        let display = truncate_str(&line.text, layout.inner_w);

        let style = match line.style {
            ModalLineStyle::Normal => Style::new().fg(t.text).bg(t.background),
            ModalLineStyle::Accent => Style::new().fg(t.accent).bg(t.background).add_modifier(TextAttributes::bold()),
            ModalLineStyle::Muted => Style::new().fg(t.text_muted).bg(t.background),
            ModalLineStyle::Primary => Style::new().fg(t.primary).bg(t.background),
            ModalLineStyle::Error => Style::new().fg(t.error).bg(t.background),
            ModalLineStyle::Heading => Style::new().fg(t.secondary).bg(t.background).add_modifier(TextAttributes::bold()),
        };

        buf.draw_str(layout.inner_x, layout.cursor_y(), display, style);
        layout.advance(1);
    }

    if line_count > content_h {
        let pct = if line_count > content_h {
            (scroll as u16 * 100) / (line_count - content_h)
        } else {
            0
        };
        let indicator = format!(" {}% ", pct.min(100));
        let ix = layout.modal.right().saturating_sub(display_width(&indicator) + 2);
        let iy = layout.modal.bottom().saturating_sub(2);
        if iy > layout.modal.y + 1 {
            buf.draw_str(ix, iy, &indicator, Style::new().fg(t.text_muted).bg(t.background));
        }
    }
}

/// OpenCode-style model dialog with search/filter.
pub fn render_model_dialog(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;

    let models = app.filtered_models_flat();

    #[derive(Clone, Copy)]
    enum DisplayRow<'a> {
        Header(&'a str),
        Model(usize),
    }

    let mut display_rows: Vec<DisplayRow<'_>> = Vec::new();
    let mut last_provider: Option<&str> = None;
    for (i, m) in models.iter().enumerate() {
        if last_provider != Some(m.provider.as_str()) {
            last_provider = Some(m.provider.as_str());
            display_rows.push(DisplayRow::Header(&m.provider));
        }
        display_rows.push(DisplayRow::Model(i));
    }

    const NUM_VISIBLE: usize = 12;
    let modal_w: u16 = ((area.width as f32 * PICKER_MODAL_WIDTH_RATIO) as u16).clamp(44, PICKER_MODAL_MAX_WIDTH);
    let total_rows = display_rows.len();
    let visible = total_rows.min(NUM_VISIBLE);

    let has_scroll_up = app.modals.model_dialog_scroll > 0;
    let has_scroll_down = total_rows > NUM_VISIBLE && app.modals.model_dialog_scroll + NUM_VISIBLE < total_rows;
    let has_indicators = has_scroll_up || has_scroll_down;

    let modal_h = (7u16 + visible as u16 + if has_indicators { 1u16 } else { 0u16 })
        .max(PICKER_MODAL_MIN_HEIGHT)
        .min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Rounded(Style::new().fg(t.text_muted).bg(t.background)),
        close_hint: CloseHint::None,
        footer_hints: None,
    });

    layout.title(buf, "Select Model", Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    let search_y = layout.cursor_y();
    buf.draw_str(layout.inner_x, search_y, "> ",
        Style::new().fg(t.text_muted).bg(t.background));
    let filter_display = if app.modals.model_dialog_filter.is_empty() {
        "type to filter...".to_string()
    } else {
        app.modals.model_dialog_filter.clone()
    };
    let filter_style = if app.modals.model_dialog_filter.is_empty() {
        Style::new().fg(t.text_muted).bg(t.background)
    } else {
        Style::new().fg(t.text).bg(t.background)
    };
    let max_filter_w = layout.inner_w.saturating_sub(2);
    let truncated_filter: String = filter_display.chars().take(max_filter_w).collect();
    buf.draw_str(layout.inner_x + 2, search_y, &truncated_filter, filter_style);

    if !app.modals.model_dialog_filter.is_empty() {
        let cursor_x = layout.inner_x + 2 + display_width(&truncated_filter);
        if cursor_x < layout.modal.right() - 1 {
            buf.put_char(cursor_x, search_y, '\u{2588}',
                Style::new().fg(t.primary).bg(t.background));
        }
    } else {
        buf.put_char(layout.inner_x + 2, search_y, '\u{2588}',
            Style::new().fg(t.primary).bg(t.background));
    }
    layout.advance(1);

    layout.separator(buf, Style::new().fg(t.border_dim));

    let scroll = app.modals.model_dialog_scroll;

    if display_rows.is_empty() {
        layout.text(buf, "No models match filter.",
            Style::new().fg(t.text_muted).bg(t.background));
    } else {
        let end_idx = (scroll + NUM_VISIBLE).min(display_rows.len());
        for vis in 0..(end_idx - scroll) {
            if !layout.has_room() { break; }
            let row = &display_rows[scroll + vis];

            match row {
                DisplayRow::Header(name) => {
                    let prov_display = format!("  {}", name);
                    buf.draw_str(layout.inner_x, layout.cursor_y(), truncate_str(&prov_display, layout.inner_w),
                        Style::new().fg(t.text_muted).bg(t.background).add_modifier(TextAttributes::bold()));
                    layout.advance(1);
                }
                DisplayRow::Model(model_idx) => {
                    let selected = *model_idx == app.modals.model_dialog_model_idx;
                    let model_info = &models[*model_idx];
                    let display = format!("  {}", truncate_str(&model_info.name, layout.inner_w.saturating_sub(2)));
                    layout.draw_item(buf, &display, selected, t);
                }
            }
        }
    }

    if has_indicators {
        let mut indicator = String::new();
        if has_scroll_up { indicator.push_str("\u{2191} "); }
        if has_scroll_down { indicator.push('\u{2193}'); }

        let ix = layout.modal.right().saturating_sub(display_width(&indicator) + 2);
        let iy = layout.cursor_y();
        buf.draw_str(ix, iy, &indicator,
            Style::new().fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));
    }
}

pub fn render_connect_picker(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let integrations = &app.modals.connect_integration_list;
    if integrations.is_empty() {
        return;
    }

    const NUM_VISIBLE: usize = 10;
    let visible = integrations.len().min(NUM_VISIBLE);
    let modal_w: u16 = (area.width * 55 / 100).clamp(48, 60);
    let modal_h = (6u16 + visible as u16).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Rounded(Style::new().fg(t.text_muted).bg(t.background)),
        close_hint: CloseHint::None,
        footer_hints: Some("\u{2191}\u{2193} nav \u{2502} Enter connect \u{2502} d disconnect \u{2502} Esc close"),
    });

    layout.title(buf, "Select Integration", Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));
    layout.advance(1);

    let scroll = app.modals.connect_picker_scroll;
    let end_idx = (scroll + NUM_VISIBLE).min(integrations.len());

    for (i, integ) in integrations.iter().enumerate() {
        if i < scroll || i >= end_idx { continue; }
        if !layout.has_room() { break; }

        let (status_icon, status_label) = if integ.connected {
            ("\u{25cf}", "connected")
        } else if integ.configured {
            ("\u{25cb}", "configured")
        } else {
            ("\u{25cb}", "not configured")
        };

        let cap_name = {
            let mut c = integ.name.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        };
        let max_name = layout.inner_w.saturating_sub(18);
        let truncated_name = truncate_str(&cap_name, max_name);
        let display = format!(
            "{} {}  {}",
            status_icon,
            truncated_name,
            status_label
        );

        let selected = i == app.modals.connect_picker_idx;
        let unselected_style = if integ.connected {
            Style::new().fg(t.text).bg(t.background)
        } else {
            Style::new().fg(t.text_muted).bg(t.background)
        };
        layout.draw_item_custom(buf, &display, selected, unselected_style, t);
    }

    layout.footer(buf, t);
}

pub fn render_api_key_prompt(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let target = app.modals.connect_target.as_deref().unwrap_or("unknown");
    let modal_w = 50u16;
    let modal_h = 8u16;

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Esc,
        footer_hints: None,
    });

    let title_display = format!(" {} ", target);
    layout.title(buf, &title_display, Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    let label = if app.modals.connect_is_integration {
        format!("Enter bot token for {}:", target)
    } else {
        format!("Enter API key for {}:", target)
    };
    layout.text(buf, &label, Style::new().fg(t.text).bg(t.background));

    let placeholder = if app.modals.connect_is_integration { "bot-token..." } else { "sk-..." };
    if app.modals.api_key_input.is_empty() {
        let config = InputRowConfig::new("", 0, placeholder);
        layout.input_row(buf, &config, t);
    } else {
        let masked = "\u{2022}".repeat(16);
        let config = InputRowConfig::new(&masked, masked.len(), "");
        layout.input_row(buf, &config, t);
    }

    let hints_y = layout.modal.bottom().saturating_sub(2);
    buf.draw_str(layout.modal.x + 2, hints_y, " Enter confirm \u{2502} Esc cancel",
        Style::new().fg(t.text_muted).bg(t.background));
}

pub fn render_provider_picker(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let providers = &app.modals.available_providers;
    if providers.is_empty() {
        return;
    }

    const NUM_VISIBLE: usize = 10;
    let visible = providers.len().min(NUM_VISIBLE);
    let modal_w: u16 = (area.width * 50 / 100).clamp(40, 52);
    let modal_h = (4u16 + visible as u16).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Rounded(Style::new().fg(t.text_muted).bg(t.background)),
        close_hint: CloseHint::None,
        footer_hints: None,
    });

    layout.title(buf, "Select Provider", Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));
    layout.advance(1);

    let scroll = app.modals.provider_picker_scroll;
    let end_idx = (scroll + NUM_VISIBLE).min(providers.len());

    let mut last_cat: Option<&str> = None;
    for (i, p) in providers.iter().enumerate() {
        if i < scroll || i >= end_idx { continue; }
        if !layout.has_room() { break; }

        if last_cat != Some(p.category.as_str()) {
            last_cat = Some(p.category.as_str());
            let cat_label = match p.category.as_str() {
                "cloud" => "Cloud",
                "cloud-cn" => "Cloud (CN)",
                "inference" => "Inference",
                "local" => "Local",
                other => other,
            };
            buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("  {}", cat_label),
                Style::new().fg(t.text_muted).bg(t.background).add_modifier(TextAttributes::bold()));
            layout.advance(1);
            if !layout.has_room() { break; }
            continue;
        }

        let selected = i == app.modals.provider_picker_idx;
        let key_icon = if p.needs_api_key {
            if p.has_key { "\u{2713} " } else { "\u{2022} " }
        } else {
            "  "
        };
        let display = format!("{}{}", key_icon, truncate_str(&p.name, layout.inner_w.saturating_sub(4)));

        if !layout.has_room() { break; }
        let unselected_style = if p.needs_api_key && !p.has_key {
            Style::new().fg(t.text_muted).bg(t.background)
        } else {
            Style::new().fg(t.text).bg(t.background)
        };
        layout.draw_item_custom(buf, &display, selected, unselected_style, t);
    }
}

pub fn render_memory_editor(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let entry_count = app.modals.memory_entries.len();
    let max_visible = 10u16;
    let visible = (entry_count as u16).min(max_visible);
    let modal_w = ((area.width as f32 * MODAL_WIDTH_RATIO) as u16).clamp(MODAL_MIN_WIDTH, 64);
    let modal_h = (visible + 9).max(12).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Esc,
        footer_hints: Some(" Enter add \u{2502} d delete \u{2502} \u{2191}\u{2193} navigate "),
    });

    layout.title(buf, " Memory ", Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    let cursor = app.modals.memory_editor_input.chars().count();
    let config = InputRowConfig::new(&app.modals.memory_editor_input, cursor, "Type to add...");
    layout.input_row(buf, &config, t);

    layout.separator(buf, Style::new().fg(t.border_dim));

    if app.modals.memory_entries.is_empty() {
        layout.text(buf, "No entries yet. Type above to add.", Style::new().fg(t.text_muted).bg(t.background));
    } else {
        for (i, (target, content)) in app.modals.memory_entries.iter().enumerate() {
            if !layout.has_room() { break; }
            let selected = i == app.modals.memory_editor_index;
            let max_display = layout.inner_w.saturating_sub(8);
            let display: String = content.chars().take(max_display).collect();
            let tag = if target == "user" { "[user]" } else { "[agent]" };

            if selected {
                layout.highlight_row(buf, Style::new().bg(t.primary).fg(t.background_darker));
                buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("\u{25b8} {} {}", tag, display),
                    Style::new().bg(t.primary).fg(t.background_darker).add_modifier(TextAttributes::bold()));
            } else {
                let tag_color = if target == "user" { t.secondary } else { t.text_muted };
                buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("  {} {}", tag, display),
                    Style::new().fg(tag_color).bg(t.background));
            }
            layout.advance(1);
        }
    }

    layout.footer(buf, t);
}

// ── Soul Editor Modal (view and modify personality) ──

pub fn render_soul_editor(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let modal_w = ((area.width as f32 * MODAL_WIDTH_RATIO) as u16).clamp(MODAL_MIN_WIDTH, 60);
    let modal_h = 14u16;

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Esc,
        footer_hints: None,
    });

    layout.title(buf, " Soul ", Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    if app.modals.soul_editor_input.is_empty() {
        layout.text(buf, "Default personality active", Style::new().fg(t.text_muted).bg(t.background));
    } else {
        layout.text(buf, "Current personality:", Style::new().fg(t.text_muted).bg(t.background));
    }

    let text_area_h = 5u16;
    let text_bg = t.background_panel;
    let text_area = Rect::new(layout.modal.x + 1, layout.cursor_y(), layout.modal.width.saturating_sub(2), text_area_h);
    fill_area(buf, text_area, Style::new().bg(text_bg).fg(t.text));

    let display_text = if app.modals.soul_editor_input.is_empty() {
        ""
    } else {
        &app.modals.soul_editor_input
    };

    let max_chars = layout.inner_w.saturating_sub(2);
    let chars: Vec<char> = display_text.chars().collect();
    let text_start_y = layout.cursor_y();
    let mut row = 0u16;
    let mut col = 0usize;
    for &ch in &chars {
        if row >= text_area_h { break; }
        let cx = layout.inner_x + 1 + col as u16;
        if cx < layout.modal.right() - 2 {
            buf.put_char(cx, text_start_y + row, ch, Style::new().fg(t.text).bg(text_bg));
        }
        col += 1;
        if col >= max_chars {
            col = 0;
            row += 1;
        }
    }

    let cursor_row = row.min(text_area_h - 1);
    let cursor_col = col.min(max_chars.saturating_sub(1)) as u16;
    let cx = layout.inner_x + 1 + cursor_col;
    if cx < layout.modal.right() - 2 && cursor_row < text_area_h {
        buf.put_char(cx, text_start_y + cursor_row, '\u{2588}', Style::new().fg(t.primary).bg(text_bg));
    }

    layout.advance(text_area_h);
    layout.separator(buf, Style::new().fg(t.border_dim));
    buf.draw_str(layout.inner_x, layout.cursor_y(), " Enter save \u{2502} Ctrl+R reset \u{2502} Type to edit ",
        Style::new().fg(t.text_muted).bg(t.background));
}

pub fn render_skill_browser(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let query = app.modals.skill_browser_filter.to_lowercase();
    let filtered: Vec<(usize, &sediman_tui_bridge::HubSkill)> = app
        .modals.skill_browser_skills
        .iter()
        .enumerate()
        .filter(|(_, s)| {
            if query.is_empty() {
                return true;
            }
            let searchable = format!("{} {} {} {}", s.name, s.description, s.category, s.author).to_lowercase();
            searchable.contains(&query)
        })
        .collect();

    let modal_w = (area.width * 85 / 100).max(60).min(area.width.saturating_sub(4));
    let max_items_on_screen = area.height.saturating_sub(8) as usize;
    let max_visible = filtered.len().min(max_items_on_screen);
    let modal_h = (max_visible as u16 + 7).max(12).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Esc,
        footer_hints: Some(" Enter run/inst \u{2502} d uninstall \u{2502} i info \u{2502} j/k nav \u{2502} / search "),
    });

    layout.title(
        buf,
        &format!(
            " Skills ({}/{}) ",
            if query.is_empty() { app.modals.skill_browser_skills.len() } else { filtered.len() },
            app.modals.skill_browser_skills.len()
        ),
        Style::new().fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()),
    );

    let filter_cursor = app.modals.skill_browser_filter.chars().count();
    let config = if app.modals.skill_browser_filter.is_empty() && !app.modals.skill_browser_filter_active {
        InputRowConfig::new("", 0, "Press / to search...")
    } else {
        InputRowConfig::new(&app.modals.skill_browser_filter, filter_cursor, "")
    };
    layout.input_row(buf, &config, t);

    layout.separator(buf, Style::new().fg(t.border_dim));

    let desc_area_y = layout.content_end().saturating_sub(2);
    let max_y = desc_area_y;

    if filtered.is_empty() {
        if app.modals.skill_browser_skills.is_empty() {
            layout.text(buf, "No skills found in hub.", Style::new().fg(t.text_muted).bg(t.background));
        } else {
            layout.text(buf, "No matches for filter.", Style::new().fg(t.text_muted).bg(t.background));
        }
    } else {
        let scroll = app.modals.skill_browser_scroll as usize;
        let visible_items: Vec<_> = filtered.iter().skip(scroll).collect();
        for (row_idx, &(_orig_idx, skill)) in visible_items.iter().enumerate() {
            if layout.cursor_y() >= max_y {
                break;
            }
            let selected = scroll + row_idx == app.modals.skill_browser_selected;
            let is_installed = skill.installed;
            let badge_w = if is_installed { 13 } else { 0 };
            let max_name = layout.inner_w.saturating_sub(6 + badge_w);
            let name_display: String = truncate_str(&skill.name, max_name).to_string();
            let badge = if is_installed { " \u{2713}installed" } else { "" };

            if selected {
                layout.highlight_row(buf, Style::new().bg(t.primary).fg(t.background));
                buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("\u{25b8} {}{}", name_display, badge),
                    Style::new().bg(t.primary).fg(t.background_darker).add_modifier(TextAttributes::bold()));
            } else {
                let name_style = if is_installed {
                    Style::new().fg(t.secondary).bg(t.background)
                } else {
                    Style::new().fg(t.text).bg(t.background)
                };
                buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("  {}{}", name_display, badge), name_style);
            }
            layout.advance(1);
        }

        layout.separator(buf, Style::new().fg(t.border_dim));

        if let Some(&(_, selected_skill)) = filtered.get(app.modals.skill_browser_selected) {
            let max_desc = layout.inner_w.saturating_sub(4);
            let desc = truncate_str(&selected_skill.description, max_desc);
            layout.text(buf, desc, Style::new().fg(t.text).bg(t.background));
        }
    }

    layout.footer(buf, t);
}

pub fn render_session_browser(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let query = app.modals.session_filter.to_lowercase();
    let filtered: Vec<(usize, &sediman_tui_bridge::SessionInfo)> = app.modals.session_list
        .iter()
        .enumerate()
        .filter(|(_, s)| {
            if query.is_empty() { return true; }
            let searchable = format!("{} {}", s.task, s.id).to_lowercase();
            searchable.contains(&query)
        })
        .collect();

    let modal_w = ((area.width as f32 * MODAL_WIDTH_RATIO) as u16).clamp(52, 72);
    let content_rows = filtered.len().min(8);
    let modal_h = (content_rows as u16 + 9).max(10).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Esc,
        footer_hints: Some(" Enter view \u{2502} d delete \u{2502} \u{2191}\u{2193} navigate \u{2502} Type to search "),
    });

    layout.title(buf, &format!(" Sessions ({}) ", app.modals.session_list.len()), Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    let session_cursor = app.modals.session_filter.chars().count();
    let config = InputRowConfig::new(&app.modals.session_filter, session_cursor, "Type to search sessions...");
    layout.input_row(buf, &config, t);
    layout.blank();

    if filtered.is_empty() {
        if app.modals.session_list.is_empty() {
            layout.text(buf, "No sessions yet. Tasks will appear here.", Style::new().fg(t.text_muted).bg(t.background));
        } else {
            layout.text(buf, "No matches for filter.", Style::new().fg(t.text_muted).bg(t.background));
        }
    } else {
        for (i, (_, session)) in filtered.iter().enumerate() {
            if !layout.has_room() { break; }
            let selected = i == app.modals.session_selected;
            let max_task = layout.inner_w.saturating_sub(8);
            let task_display = truncate_str(&session.task, max_task);
            let id_str = format!("#{}", session.id);

            if selected {
                layout.highlight_row(buf, Style::new().bg(t.primary).fg(t.background));
                buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("\u{25b8} {} {}", id_str, task_display),
                    Style::new().bg(t.primary).fg(t.background).add_modifier(TextAttributes::bold()));
            } else {
                buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("  {} {}", id_str, task_display),
                    Style::new().fg(t.text).bg(t.background));
            }

            if layout.has_room() {
                layout.advance(1);
                let ts = truncate_str(&session.created_at, layout.inner_w.saturating_sub(4));
                let ts_style = if selected {
                    Style::new().bg(t.primary).fg(t.background)
                } else {
                    Style::new().fg(t.text_muted).bg(t.background)
                };
                buf.draw_str(layout.inner_x + 2, layout.cursor_y(), ts, ts_style);
            }
            layout.advance(1);
        }
    }

    layout.footer(buf, t);
}

pub fn render_theme_picker(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let modal_w = (area.width as usize * 6 / 10).clamp(36, 50) as u16;
    let modal_h = (app.modals.theme_picker_names.len().min(14) as u16 + 6).clamp(10, 24);

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Esc,
        footer_hints: None,
    });

    layout.title(buf, " Themes ", Style::new().fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    for (i, name) in app.modals.theme_picker_names.iter().enumerate() {
        if layout.cursor_y() >= layout.modal.bottom().saturating_sub(3) { break; }

        let is_current = *name == app.theme_name;
        let is_selected = i == app.modals.theme_picker_selected;

        let (marker, row_style) = if is_selected {
            ("\u{25b8}", Style::new().fg(t.background).bg(t.primary))
        } else if is_current {
            ("\u{25c6}", Style::new().fg(t.secondary).bg(t.background))
        } else {
            (" ", Style::new().fg(t.text).bg(t.background))
        };

        buf.draw_str(layout.inner_x, layout.cursor_y(), marker, row_style);

        let label = if is_current { format!(" {} (current)", name) } else { format!(" {}", name) };
        buf.draw_str(layout.inner_x + 2, layout.cursor_y(), &label, row_style);

        if let Some(theme) = sediman_tui_core::styling::load_theme(name) {
            let swatches = theme.swatch_colors();
            let swatch_x = layout.modal.right().saturating_sub(12);
            for (si, &color) in swatches.iter().enumerate() {
                let sx = swatch_x + si as u16 * 2;
                let s = Style::new().fg(color).bg(if is_selected { t.primary } else { t.background });
                buf.draw_str(sx, layout.cursor_y(), "\u{2588}\u{2588}", s);
            }
        }

        layout.advance(1);
    }

    let sep_y = layout.modal.bottom().saturating_sub(3);
    for sx in (layout.modal.x + 1)..(layout.modal.right() - 1) {
        buf.put_char(sx, sep_y, '\u{2500}', Style::new().fg(t.border_dim));
    }

    let hints_y = layout.modal.bottom().saturating_sub(2);
    buf.draw_str(layout.modal.x + 2, hints_y,
        " \u{2191}\u{2193} navigate \u{2502} Enter select \u{2502} Esc cancel ",
        Style::new().fg(t.text_muted).bg(t.background));
}

pub fn render_schedule_browser(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let modal_w = ((area.width as f32 * MODAL_WIDTH_RATIO) as u16).clamp(52, 72);
    let content_rows = app.modals.schedule_jobs.len().min(8);
    let modal_h = (content_rows as u16 + 9).max(10).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Esc,
        footer_hints: Some(" Enter toggle/add \u{2502} d/\u{232b} delete \u{2502} \u{2191}\u{2193} navigate \u{2502} Type to add "),
    });

    layout.title(buf, &format!(" Schedule ({}) ", app.modals.schedule_jobs.len()), Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    let sched_cursor = app.modals.schedule_input.chars().count();
    let config = InputRowConfig::new(&app.modals.schedule_input, sched_cursor, "<cron> <task> to add...");
    layout.input_row(buf, &config, t);
    layout.blank();

    if app.modals.schedule_jobs.is_empty() {
        layout.text(buf, "No scheduled jobs. Type above to add one.", Style::new().fg(t.text_muted).bg(t.background));
    } else {
        for (i, job) in app.modals.schedule_jobs.iter().enumerate() {
            if !layout.has_room() { break; }
            let selected = i == app.modals.schedule_selected;
            let status_icon = if job.enabled { "\u{25cf}" } else { "\u{25cb}" };
            let max_task = layout.inner_w.saturating_sub(12);
            let task_display = truncate_str(&job.task, max_task);

            if selected {
                layout.highlight_row(buf, Style::new().bg(t.primary).fg(t.background));
                buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("{} {} {}", status_icon, task_display, job.cron_expr),
                    Style::new().bg(t.primary).fg(t.background).add_modifier(TextAttributes::bold()));
            } else {
                buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("{} {} {}", status_icon, task_display, job.cron_expr),
                    Style::new().fg(if job.enabled { t.text } else { t.text_muted }).bg(t.background));
            }

            if layout.has_room() {
                if let Some(ref next) = job.next_run {
                    layout.advance(1);
                    buf.draw_str(layout.inner_x + 2, layout.cursor_y(), &format!("next: {}", next),
                        Style::new().fg(t.text_muted).bg(t.background));
                }
            }
            layout.advance(1);
        }
    }

    layout.footer(buf, t);
}

// ── Coder Picker Modal ──

const CODER_BACKENDS: &[&str] = &["internal", "claude-code", "codex", "opencode"];

pub fn render_coder_picker(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let count = CODER_BACKENDS.len();
    let modal_w: u16 = 44;
    let modal_h = (6u16 + count as u16).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Rounded(Style::new().fg(t.text_muted).bg(t.background)),
        close_hint: CloseHint::None,
        footer_hints: None,
    });

    layout.title(buf, "Select Coder Backend", Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));
    layout.blank();

    for (i, backend) in CODER_BACKENDS.iter().enumerate() {
        let selected = i == app.modals.coder_picker_selected;
        let is_current = *backend == app.agent.coder_backend;
        let label = if is_current { format!("{} (current)", backend) } else { backend.to_string() };
        layout.draw_item_with_marker(buf, &label, selected, is_current, t);
    }
}

const SEARCH_MODES: &[&str] = &["auto", "simple", "advanced"];

pub fn render_search_mode_picker(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let count = SEARCH_MODES.len();
    let modal_w: u16 = 44;
    let modal_h = (6u16 + count as u16).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Rounded(Style::new().fg(t.text_muted).bg(t.background)),
        close_hint: CloseHint::None,
        footer_hints: None,
    });

    layout.title(buf, "Select Search Mode", Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    let desc = if layout.inner_w >= 40 {
        "Auto: agent chooses, Simple: web_search, Advanced: SearchSDK"
    } else {
        "Auto, Simple, Advanced"
    };
    layout.text(buf, truncate_str(desc, layout.inner_w), Style::new().fg(t.text_muted).bg(t.background));

    for (i, mode) in SEARCH_MODES.iter().enumerate() {
        let selected = i == app.modals.search_mode_picker_selected;
        let is_current = *mode == app.agent.search_mode;
        let label = match *mode {
            "auto" => "auto - agent chooses best method",
            "simple" => "simple - web_search (fast, simple)",
            "advanced" => "advanced - SearchSDK (complex research)",
            _ => *mode,
        };
        let label_str = if is_current { format!("{} (current)", label) } else { label.to_string() };
        layout.draw_item_with_marker(buf, &label_str, selected, is_current, t);
    }
}

const BROWSER_MODES: &[&str] = &["headless", "headed"];

pub fn render_browser_mode_picker(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;
    let count = BROWSER_MODES.len();
    let modal_w: u16 = 40;
    let modal_h = (6u16 + count as u16).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Rounded(Style::new().fg(t.text_muted).bg(t.background)),
        close_hint: CloseHint::None,
        footer_hints: None,
    });

    layout.title(buf, "Select Browser Mode", Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));
    layout.blank();

    for (i, mode) in BROWSER_MODES.iter().enumerate() {
        let selected = i == app.modals.browser_mode_picker_selected;
        let is_current = (*mode == "headless" && app.headless) || (*mode == "headed" && !app.headless);
        let label = match *mode {
            "headless" => "headless - no browser window (faster)",
            "headed" => "headed - show browser window",
            _ => *mode,
        };
        let label_str = if is_current { format!("{} (current)", label) } else { label.to_string() };
        layout.draw_item_with_marker(buf, &label_str, selected, is_current, t);
    }
}

pub fn render_doctor_modal(
    buf: &mut CellBuffer,
    area: Rect,
    app: &App,
    checks: &[crate::app::DoctorCheck],
    cursor: usize,
    scroll: u16,
    install_state: (&crate::app::DoctorInstallState, &[String], &str, &bool),
) {
    use crate::app::{DoctorInstallState, DoctorStatus};

    let (state, install_output, filter, search_active) = install_state;
    let t = &app.theme;
    let modal_w = (area.width * 8 / 10).clamp(52, 80);
    const CONTENT_ROWS: usize = 12;
    let search_row: u16 = if filter.is_empty() && !search_active { 0 } else { 1 };
    let modal_h = ((CONTENT_ROWS + 6 + search_row as usize) as u16).max(10).min(area.height.saturating_sub(2));

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Esc,
        footer_hints: None,
    });

    layout.title(buf, " Doctor ", Style::new()
        .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    let filtered = crate::update::modals::doctor::filtered_indices(checks, filter);
    let filtered_len = filtered.len();

    if !filter.is_empty() || *search_active {
        let search_label = "Search: ";
        buf.draw_str(layout.inner_x, layout.cursor_y(), search_label, Style::new().fg(t.text_muted));
        let input_x = layout.inner_x as usize + display_width(search_label) as usize;
        let max_input = layout.inner_w.saturating_sub(display_width(search_label) as usize + 2);
        let display_filter: String = filter.chars().take(max_input).collect();
        buf.draw_str(input_x as u16, layout.cursor_y(), &display_filter, Style::new().fg(t.text));
        if *search_active {
            let cursor_pos = (input_x + display_filter.len()) as u16;
            buf.put_char(cursor_pos, layout.cursor_y(), '\u{2588}', Style::new().fg(t.primary));
        }
        let count_label = format!("({})", filtered_len);
        let count_x = layout.inner_x as usize + layout.inner_w - count_label.len() - 1;
        buf.draw_str(count_x as u16, layout.cursor_y(), &count_label, Style::new().fg(t.text_muted));
        layout.advance(1);
    }

    match state {
        DoctorInstallState::Running { .. } => {
            let spinner = app.spinner_char();
            layout.text(buf, &format!(" {} Installing...", spinner), Style::new().fg(t.primary));

            let output_start = if install_output.len() > layout.remaining_rows() as usize {
                install_output.len().saturating_sub(layout.remaining_rows() as usize)
            } else {
                0
            };

            for line in install_output.iter().skip(output_start) {
                if !layout.has_room() { break; }
                let truncated: String = line.chars().take(layout.inner_w).collect();
                buf.draw_str(layout.inner_x, layout.cursor_y(), &truncated, Style::new().fg(t.text));
                layout.advance(1);
            }
            return;
        }
        DoctorInstallState::Confirming { cmd, .. } => {
            layout.blank();
            layout.text(buf, " Confirm installation:", Style::new().fg(t.primary).add_modifier(TextAttributes::bold()));
            layout.blank();

            let cmd_display: String = cmd.chars().take(layout.inner_w.saturating_sub(2)).collect();
            buf.draw_str(layout.inner_x + 1, layout.cursor_y(), &cmd_display, Style::new().fg(t.text));
            layout.advance(1);

            layout.blank();
            buf.draw_str(layout.inner_x, layout.cursor_y(), " [Enter] run  [Esc] cancel", Style::new().fg(t.text_muted));
            layout.advance(1);
            return;
        }
        DoctorInstallState::Idle => {}
    }

    let visible_count = layout.remaining_rows() as usize;
    let visible_start = scroll as usize;
    let visible_end = (visible_start + visible_count).min(filtered_len);

    let mut prev_category = "";

    for vi in visible_start..visible_end {
        let i = filtered[vi];
        let check = &checks[i];

        if !layout.has_room() {
            break;
        }
        if check.category != prev_category {
            layout.blank();
            if !layout.has_room() {
                break;
            }
            buf.draw_str(layout.inner_x, layout.cursor_y(), &check.category, Style::new()
                .fg(t.primary).add_modifier(TextAttributes::bold()));
            layout.advance(1);
            prev_category = &check.category;
        }

        if !layout.has_room() {
            break;
        }

        let (icon, icon_fg) = match check.status {
            DoctorStatus::Pass => ('\u{2713}', t.secondary),
            DoctorStatus::Fail => ('\u{2717}', t.error),
            DoctorStatus::Warn => ('\u{25cb}', t.text_muted),
        };

        let selected = i == cursor;
        let bg = if selected { t.background_panel } else { t.background };

        if selected {
            layout.highlight_row(buf, Style::new().bg(bg));
            buf.put_char(layout.inner_x, layout.cursor_y(), '\u{25b6}', Style::new().fg(t.primary).bg(bg));
        }

        let name_x = layout.inner_x + 2;
        let name_w: usize = 16;
        let name_display: String = check.name.chars().take(name_w).collect();
        buf.draw_str(name_x, layout.cursor_y(), &name_display, Style::new().fg(t.text).bg(bg));

        let msg_x = name_x as usize + name_w + 1;
        let icon_reserve: usize = 4;
        let max_msg = layout.inner_w.saturating_sub(name_w + icon_reserve + 2);
        let msg_display: String = check.message.chars().take(max_msg).collect();
        buf.draw_str(msg_x as u16, layout.cursor_y(), &msg_display, Style::new().fg(t.text_muted).bg(bg));

        let icon_x = layout.inner_x as usize + layout.inner_w - 2;
        buf.put_char(icon_x as u16, layout.cursor_y(), icon, Style::new().fg(if selected { t.text } else { icon_fg }).bg(bg));

        let install_cmd: Option<&str> = check.install_cmd.as_deref();
        if selected && install_cmd.is_some() && check.status != DoctorStatus::Pass {
            let msg_end = msg_x + display_width(&msg_display) as usize + 1;
            if msg_end + 11 < icon_x {
                buf.draw_str(msg_end as u16, layout.cursor_y(), "\u{23ce} install", Style::new().fg(t.primary).bg(bg));
            }
        }

        layout.advance(1);
    }

    let footer_y = layout.modal.bottom().saturating_sub(2);
    buf.draw_str(layout.inner_x, footer_y, "Enter: install | /: search | r: re-check | \u{2191}\u{2193}: nav", Style::new().fg(t.text_muted));
}


/// Render the memory system picker modal.
pub fn render_memory_system_picker(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;

    if let Some(AppModal::MemorySystemPicker { ref systems, ref selected }) = app.modals.active {
        const NUM_VISIBLE: usize = 5;
        let visible = systems.len().min(NUM_VISIBLE);
        let modal_w: u16 = 40;
        let modal_h = (4u16 + visible as u16).min(area.height.saturating_sub(2));

        let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
            border: BorderKind::Rounded(Style::new().fg(t.text_muted).bg(t.background)),
            close_hint: CloseHint::None,
            footer_hints: None,
        });

        layout.title(buf, "Select Memory System", Style::new()
            .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));
        layout.blank();

        for (i, system) in systems.iter().enumerate() {
            if i >= *selected + NUM_VISIBLE || i < selected.saturating_sub(NUM_VISIBLE) {
                continue;
            }
            if !layout.has_room() { break; }

            let is_selected = i == *selected;
            if is_selected {
                layout.highlight_row(buf, Style::new().bg(t.primary).fg(t.background));
            }
            let fg = if is_selected { t.background } else { t.text };
            let bg = if is_selected { t.primary } else { t.background };
            buf.draw_str(layout.inner_x, layout.cursor_y(), system, Style::new().fg(fg).bg(bg).add_modifier(TextAttributes::bold()));
            layout.advance(1);
        }

        let footer_y = layout.modal.bottom().saturating_sub(2);
        buf.draw_str(layout.inner_x, footer_y, "Enter: select | \u{2191}\u{2193}: navigate | Esc: cancel",
            Style::new().fg(t.text_muted));
    }
}

pub fn render_memory_menu(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;

    if let Some(AppModal::MemoryMenu { ref selected }) = app.modals.active {
        const MENU_OPTIONS: &[&str] = &[
            "View Memory Stats",
            "Switch Memory System",
            "Show Current System",
        ];
        const NUM_VISIBLE: usize = 5;
        let visible = MENU_OPTIONS.len().min(NUM_VISIBLE);
        let modal_w: u16 = 40;
        let modal_h = (4u16 + visible as u16).min(area.height.saturating_sub(2));

        let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
            border: BorderKind::Rounded(Style::new().fg(t.text_muted).bg(t.background)),
            close_hint: CloseHint::None,
            footer_hints: None,
        });

        layout.title(buf, "Memory", Style::new()
            .fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));
        layout.blank();

        for (i, option) in MENU_OPTIONS.iter().enumerate() {
            if i >= *selected + NUM_VISIBLE || i < selected.saturating_sub(NUM_VISIBLE) {
                continue;
            }
            if !layout.has_room() { break; }

            let is_selected = i == *selected;
            if is_selected {
                layout.highlight_row(buf, Style::new().bg(t.primary).fg(t.background));
            }
            let fg = if is_selected { t.background } else { t.text };
            let bg = if is_selected { t.primary } else { t.background };
            buf.draw_str(layout.inner_x, layout.cursor_y(), option, Style::new().fg(fg).bg(bg).add_modifier(TextAttributes::bold()));
            layout.advance(1);
        }

        let footer_y = layout.modal.bottom().saturating_sub(2);
        buf.draw_str(layout.inner_x, footer_y, "Enter: select | \u{2191}\u{2193}: navigate | Esc: cancel",
            Style::new().fg(t.text_muted));
    }
}

/// Render the update available modal.
pub fn render_update_available_modal(buf: &mut CellBuffer, area: Rect, app: &App) {
    let t = &app.theme;

    if let Some(AppModal::UpdateAvailable {
        ref version,
        ref release_notes,
        ref current_version,
        ref selected,
        ref show_notes,
        ref notes_scroll,
        ref installing,
        ref install_progress,
    }) = app.modals.active
    {
        const NUM_VISIBLE_NOTES: usize = 15;
        const NOTES_WIDTH: u16 = 70;

        let notes_lines: Vec<String> = if *show_notes {
            release_notes.lines().map(|s| s.to_string()).collect()
        } else {
            vec![]
        };

        let modal_w = if *show_notes {
            (area.width as usize * 9 / 10).clamp(NOTES_WIDTH as usize, 90) as u16
        } else {
            60
        };

        let content_h = if *show_notes {
            (notes_lines.len() as u16).min(NUM_VISIBLE_NOTES as u16)
        } else {
            0
        };

        let base_h = if *installing { 8 } else { 10 };
        let modal_h = base_h + content_h + 2;

        let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
            border: BorderKind::Square { top: Style::new().fg(t.secondary), bottom: Style::new().fg(t.secondary) },
            close_hint: CloseHint::Esc,
            footer_hints: None,
        });

        let title = if *installing { " Installing Update " } else { " Update Available " };
        layout.title(buf, title, Style::new()
            .fg(t.secondary).bg(t.background).add_modifier(TextAttributes::bold()));

        if !installing {
            buf.draw_str(layout.inner_x, layout.cursor_y(), "Current: ",
                Style::new().fg(t.text_muted).bg(t.background));
            buf.draw_str(layout.inner_x + 9, layout.cursor_y(), current_version,
                Style::new().fg(t.text).bg(t.background).add_modifier(TextAttributes::bold()));
            layout.advance(1);

            buf.draw_str(layout.inner_x, layout.cursor_y(), "Latest:  ",
                Style::new().fg(t.text_muted).bg(t.background));
            buf.draw_str(layout.inner_x + 9, layout.cursor_y(), version,
                Style::new().fg(t.accent).bg(t.background).add_modifier(TextAttributes::bold()));
            layout.advance(2);
        } else {
            layout.text(buf, "Installing update...",
                Style::new().fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

            let progress_display = truncate_str(install_progress, layout.inner_w);
            layout.text(buf, progress_display,
                Style::new().fg(t.text).bg(t.background));
            layout.blank();
        }

        if *show_notes && !installing {
            layout.text(buf, "Release Notes:",
                Style::new().fg(t.secondary).bg(t.background).add_modifier(TextAttributes::bold()));

            let notes_scroll = *notes_scroll as usize;
            let end_line = (notes_scroll + NUM_VISIBLE_NOTES).min(notes_lines.len());

            for (_i, line) in notes_lines.iter().enumerate().skip(notes_scroll).take(end_line - notes_scroll) {
                if layout.cursor_y() >= layout.modal.bottom().saturating_sub(2) { break; }

                let display = truncate_str(line, layout.inner_w.saturating_sub(2));
                buf.draw_str(layout.inner_x + 1, layout.cursor_y(), display, Style::new().fg(t.text).bg(t.background));
                layout.advance(1);
            }

            if notes_lines.len() > NUM_VISIBLE_NOTES {
                let pct = if notes_lines.len() > NUM_VISIBLE_NOTES {
                    (notes_scroll * 100) / (notes_lines.len() - NUM_VISIBLE_NOTES)
                } else {
                    0
                };
                let indicator = format!(" {}% ", pct.min(100));
                let ix = layout.modal.right().saturating_sub(display_width(&indicator) + 2);
                let iy = layout.modal.bottom().saturating_sub(2);
                buf.draw_str(ix, iy, &indicator, Style::new().fg(t.text_muted).bg(t.background));
            }

            layout.blank();
        }

        if !installing {
            let options = ["Update Now", "Skip", "Release Notes"];
            let button_start_x = layout.inner_x + layout.inner_w.saturating_sub(options.len() * 12 + (options.len() - 1) * 2) as u16;
            let mut x = button_start_x;

            for (i, option) in options.iter().enumerate() {
                let is_selected = i == *selected;
                let style = if is_selected {
                    Style::new().fg(t.background).bg(t.secondary).add_modifier(TextAttributes::bold())
                } else {
                    Style::new().fg(t.secondary).bg(t.background)
                };

                let btn_text = if is_selected {
                    format!("[ {} ]", option)
                } else {
                    format!("  {}  ", option)
                };

                buf.draw_str(x, layout.cursor_y(), &btn_text, style);
                x += option.len() as u16 + 4;
            }
        }

        let footer_y = layout.modal.bottom().saturating_sub(2);
        let hint = if *installing {
            "Please wait...".to_string()
        } else if *show_notes {
            "\u{2191}\u{2193}: scroll | Enter: confirm | Esc: close".to_string()
        } else {
            "\u{2190}\u{2192}/Tab: choose | Enter: confirm | Esc: close".to_string()
        };
        buf.draw_str(layout.inner_x, footer_y, &hint, Style::new().fg(t.text_muted).bg(t.background));
    }
}

pub fn render_onboarding_wizard(buf: &mut CellBuffer, area: Rect, app: &App, step: u8) {
    let t = &app.theme;
    let modal_w: u16 = 62;
    let modal_h: u16 = 18;

    let mut layout = ModalLayout::new(buf, area, t, modal_w, modal_h, ModalConfig {
        border: BorderKind::Square { top: Style::new().fg(t.primary), bottom: Style::new().fg(t.border) },
        close_hint: CloseHint::Esc,
        footer_hints: None,
    });

    let title = match step {
        0 => " Welcome to OpenSkynet ",
        1 => " Choose Provider ",
        _ => " Enter API Key ",
    };
    layout.title(buf, title, Style::new().fg(t.primary).bg(t.background).add_modifier(TextAttributes::bold()));

    match step {
        0 => {
            layout.text(buf, "AI browser employee \u{2014} browse, code, automate",
                Style::new().fg(t.text).bg(t.background));

            let lines = [
                "",
                "I can help you:",
                "  \u{2022} Browse the web and extract information",
                "  \u{2022} Write and run code in any language",
                "  \u{2022} Deploy applications to production",
                "  \u{2022} Automate repetitive tasks",
                "  \u{2022} Create AI-powered skills",
                "",
                "You'll need an API key from OpenAI, Anthropic, or",
                "another LLM provider. We'll set that up next.",
            ];
            for line in lines.iter() {
                buf.draw_str(layout.inner_x, layout.cursor_y(), line, Style::new().fg(t.text_muted).bg(t.background));
                layout.advance(1);
            }

            let btn_text = "  Press Enter to start setup  ";
            let btn_style = Style::new().fg(t.background).bg(t.primary).add_modifier(TextAttributes::bold());
            let btn_x = layout.inner_x + (layout.inner_w as u16).saturating_sub(btn_text.len() as u16) / 2;
            buf.draw_str(btn_x, layout.cursor_y(), btn_text, btn_style);
        }
        1 => {
            layout.text(buf, "Pick your AI provider:",
                Style::new().fg(t.text).bg(t.background));

            let providers: Vec<String> = app.modals.available_providers.iter().map(|p| p.name.clone()).collect();

            if providers.is_empty() {
                layout.blank();
                layout.text(buf, "  Connecting to backend...",
                    Style::new().fg(t.text_muted).bg(t.background));
            } else {
                let visible = 10usize;
                let start = app.modals.provider_picker_scroll.min(providers.len().saturating_sub(visible));
                let end = (start + visible).min(providers.len());

                layout.blank();
                for (i, name) in providers[start..end].iter().enumerate() {
                    let idx = start + i;
                    let selected = idx == app.modals.provider_picker_idx;

                    let prefix = if selected { "\u{25b6} " } else { "  " };
                    let label = format!("{}{}", prefix, name);

                    let style = if selected {
                        Style::new().fg(t.background).bg(t.primary).add_modifier(TextAttributes::bold())
                    } else {
                        Style::new().fg(t.text).bg(t.background)
                    };
                    buf.draw_str(layout.inner_x, layout.cursor_y(), &label, style);

                    if selected {
                        let padding = " ".repeat(layout.inner_w.saturating_sub(label.len()));
                        buf.draw_str(layout.inner_x + label.len() as u16, layout.cursor_y(), &padding, style);
                    }
                    layout.advance(1);
                }

                if !providers.is_empty() {
                    while layout.cursor_y() < layout.modal.bottom().saturating_sub(4) {
                        layout.advance(1);
                    }
                    buf.draw_str(layout.inner_x, layout.cursor_y(), "\u{2191}\u{2193}: choose  |  Enter: confirm",
                        Style::new().fg(t.text_muted).bg(t.background));
                }
            }
        }
        _ => {
            buf.draw_str(layout.inner_x, layout.cursor_y(), &format!("Provider: {}", app.modals.onboarding_provider),
                Style::new().fg(t.secondary).bg(t.background).add_modifier(TextAttributes::bold()));
            layout.advance(2);
            layout.text(buf, "Enter your API key:", Style::new().fg(t.text).bg(t.background));

            let masked = if app.modals.api_key_input.is_empty() {
                "sk-...".to_string()
            } else {
                "\u{2022}".repeat(16)
            };

            let input_style = Style::new().fg(t.text).bg(t.background_panel);
            buf.draw_str(layout.inner_x, layout.cursor_y(), "\u{276f} ", Style::new().fg(t.primary).bg(t.background_panel));
            buf.draw_str(layout.inner_x + 3, layout.cursor_y(), &masked, input_style);
            let pad = " ".repeat(layout.inner_w.saturating_sub(masked.len() + 3));
            buf.draw_str(layout.inner_x + masked.len() as u16 + 3, layout.cursor_y(), &pad, input_style);

            layout.advance(4);
            buf.draw_str(layout.inner_x, layout.cursor_y(), "Type your key (input is hidden)  |  Enter: finish",
                Style::new().fg(t.text_muted).bg(t.background));
        }
    }

    let dots_y = layout.modal.bottom().saturating_sub(1);
    let dots_x = layout.inner_x + (layout.inner_w as u16).saturating_sub(7) / 2;
    let step_dots: String = (0..=2u8).map(|s| {
        if s == step { "\u{25c9}" } else { "\u{25cf}" }
    }).collect();
    let dots_str = format!("  {}", step_dots);
    buf.draw_str(dots_x, dots_y, &dots_str, Style::new().fg(t.text_muted).bg(t.background));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app::App;
    use sediman_tui_bridge::ApiClient;

    fn test_app() -> App {
        App::new("test".into(), Some("gpt-4".into()), None, true, ApiClient::new("/tmp/test_opencode.sock"))
    }

    fn render_area() -> Rect {
        Rect::new(0, 0, 80, 24)
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

    fn find_highlighted(buf: &CellBuffer, color: sediman_tui_core::renderer::Color) -> bool {
        for y in 0..buf.height() {
            for x in 0..buf.width() {
                if let Some(cell) = buf.get(x, y) {
                    if cell.style.bg == Some(color) { return true; }
                }
            }
        }
        false
    }

    #[test]
    fn test_render_help_modal_has_title() {
        let mut buf = CellBuffer::new(80, 24);
        let app = test_app();
        render_help_modal(&mut buf, render_area(), &app, 0);
        assert!(find_str(&buf, "Commands"), "Help modal should contain 'Commands'");
    }

    #[test]
    fn test_render_help_modal_has_border() {
        let mut buf = CellBuffer::new(80, 24);
        let app = test_app();
        render_help_modal(&mut buf, render_area(), &app, 0);
        assert!(find_char(&buf, '\u{2500}'), "Help modal should have a border");
    }

    #[test]
    fn test_render_help_modal_scrolls() {
        let mut buf1 = CellBuffer::new(80, 24);
        let app = test_app();
        render_help_modal(&mut buf1, render_area(), &app, 0);
        let has_general = find_str(&buf1, "General");
        let mut buf2 = CellBuffer::new(80, 24);
        render_help_modal(&mut buf2, render_area(), &app, 100);
        let has_general_scrolled = find_str(&buf2, "General");
        assert_ne!(has_general, has_general_scrolled, "Scrolling should change rendered content");
    }

    #[test]
    fn test_render_model_dialog_has_title() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.model_dialog_scroll = 0;
        app.modals.model_dialog_model_idx = 0;
        render_model_dialog(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "Select Model"), "Model dialog should show 'Select Model' title");
    }

    #[test]
    fn test_render_model_dialog_has_separator() {
        let mut buf = CellBuffer::new(80, 24);
        let app = test_app();
        render_model_dialog(&mut buf, render_area(), &app);
        assert!(find_char(&buf, '\u{2500}'), "Model dialog should have a separator");
    }

    #[test]
    fn test_render_coder_picker_shows_options() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.coder_picker_selected = 0;
        app.agent.coder_backend = "internal".to_string();
        render_coder_picker(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "internal"), "Coder picker should show 'internal' option");
    }

    #[test]
    fn test_render_coder_picker_highlights_selected() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.coder_picker_selected = 1;
        app.agent.coder_backend = "internal".to_string();
        render_coder_picker(&mut buf, render_area(), &app);
        assert!(find_highlighted(&buf, app.theme.primary), "Coder picker should highlight selected item");
    }

    #[test]
    fn test_render_search_mode_picker_has_description() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.search_mode_picker_selected = 0;
        app.agent.search_mode = "auto".to_string();
        render_search_mode_picker(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "Auto"), "Search mode picker should show description");
    }

    #[test]
    fn test_render_browser_mode_picker() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.browser_mode_picker_selected = 0;
        app.headless = true;
        render_browser_mode_picker(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "headless"), "Browser mode picker should show 'headless' option");
    }

    #[test]
    fn test_render_api_key_prompt_shows_label() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.connect_target = Some("OpenAI".to_string());
        app.modals.connect_is_integration = false;
        app.modals.api_key_input = String::new();
        render_api_key_prompt(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "Enter"), "API key prompt should show 'Enter' label");
    }

    #[test]
    fn test_render_api_key_prompt_shows_placeholder() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.connect_target = Some("OpenAI".to_string());
        app.modals.connect_is_integration = false;
        app.modals.api_key_input = String::new();
        render_api_key_prompt(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "k-"), "API key prompt should show 'sk-...' placeholder");
    }

    #[test]
    fn test_render_memory_editor_shows_title() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.memory_editor_input = String::new();
        app.modals.memory_entries = vec![];
        render_memory_editor(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "Memory"), "Memory editor should show 'Memory' title");
    }

    #[test]
    fn test_render_memory_editor_shows_input_row() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.memory_editor_input = String::new();
        app.modals.memory_entries = vec![];
        render_memory_editor(&mut buf, render_area(), &app);
        assert!(find_char(&buf, '\u{276f}'), "Memory editor should show input prompt");
    }

    #[test]
    fn test_render_memory_editor_shows_entries() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.memory_editor_input = String::new();
        app.modals.memory_entries = vec![
            ("user".to_string(), "remember this".to_string()),
            ("agent".to_string(), "noted that".to_string()),
        ];
        app.modals.memory_editor_index = 0;
        render_memory_editor(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "[user]"), "Memory editor should show entries with tags");
    }

    #[test]
    fn test_render_memory_editor_has_footer() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.memory_editor_input = String::new();
        app.modals.memory_entries = vec![];
        render_memory_editor(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "Enter"), "Memory editor should show footer hints");
    }

    #[test]
    fn test_render_soul_editor_has_title() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.soul_editor_input = String::new();
        render_soul_editor(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "Soul"), "Soul editor should show 'Soul' title");
    }

    #[test]
    fn test_render_soul_editor_empty_shows_default() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.soul_editor_input = String::new();
        render_soul_editor(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "Default"), "Soul editor should show 'Default' when empty");
    }

    #[test]
    fn test_render_soul_editor_with_input() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.soul_editor_input = "You are helpful".to_string();
        render_soul_editor(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "Current"), "Soul editor should show 'Current' when has input");
    }

    #[test]
    fn test_render_theme_picker_shows_themes() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.theme_picker_names = vec!["default".to_string(), "dracula".to_string()];
        app.modals.theme_picker_selected = 0;
        app.theme_name = "default".to_string();
        render_theme_picker(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "default"), "Theme picker should show 'default' theme");
    }

    #[test]
    fn test_render_theme_picker_highlights_selected() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.theme_picker_names = vec!["default".to_string()];
        app.modals.theme_picker_selected = 0;
        app.theme_name = "default".to_string();
        render_theme_picker(&mut buf, render_area(), &app);
        assert!(find_highlighted(&buf, app.theme.primary), "Theme picker should highlight selected theme");
    }

    #[test]
    fn test_render_schedule_browser_empty() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.schedule_input = String::new();
        app.modals.schedule_jobs = vec![];
        render_schedule_browser(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "No scheduled"), "Schedule browser should show empty message");
    }

    #[test]
    fn test_render_session_browser_empty() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.session_filter = String::new();
        app.modals.session_list = vec![];
        render_session_browser(&mut buf, render_area(), &app);
        assert!(find_str(&buf, "No sessions"), "Session browser should show empty message");
    }

    #[test]
    fn test_render_info_modal_renders_lines() {
        let mut buf = CellBuffer::new(80, 24);
        let app = test_app();
        let lines = vec![
            crate::app::ModalLine::new("Hello World", crate::app::ModalLineStyle::Normal),
            crate::app::ModalLine::new("Important", crate::app::ModalLineStyle::Accent),
        ];
        render_info_modal(&mut buf, render_area(), &app, "Test", &lines, 0);
        assert!(find_str(&buf, "Hello"), "Info modal should render text lines");
    }

    #[test]
    fn test_render_info_modal_applies_styles() {
        let mut buf = CellBuffer::new(80, 24);
        let app = test_app();
        let lines = vec![
            crate::app::ModalLine::new("NormalTxt", crate::app::ModalLineStyle::Normal),
            crate::app::ModalLine::new("AccentTxt", crate::app::ModalLineStyle::Accent),
        ];
        render_info_modal(&mut buf, render_area(), &app, "Test", &lines, 0);
        let mut found_bold = false;
        for y in 0..buf.height() {
            for x in 0..buf.width() {
                if let Some(cell) = buf.get(x, y) {
                    if cell.ch == 'A' && cell.style.attrs.bold { found_bold = true; }
                }
            }
        }
        assert!(found_bold, "Info modal accent style should be bold");
    }

    #[test]
    fn test_modal_frame_is_centered() {
        let mut buf = CellBuffer::new(80, 24);
        let mut app = test_app();
        app.modals.coder_picker_selected = 0;
        app.agent.coder_backend = "internal".to_string();
        render_coder_picker(&mut buf, render_area(), &app);
        let mut leftmost = 80u16;
        let mut rightmost = 0u16;
        for x in 0..80u16 {
            for y in 0..24u16 {
                if let Some(cell) = buf.get(x, y) {
                    if cell.ch != '\0' && cell.ch != ' ' {
                        leftmost = leftmost.min(x);
                        rightmost = rightmost.max(x);
                    }
                }
            }
        }
        let center = (leftmost + rightmost) / 2;
        assert!(center > 20 && center < 60, "Modal should be roughly centered (center={})", center);
    }
}
