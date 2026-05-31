use sediman_tui_core::command::{Command, CommandCategory};

use crate::app::{App, AppModal};

pub async fn handle_connect(app: &mut App, args: &str) {
    if !args.is_empty() {
        let name = args.trim().to_lowercase();
        let needs_key = app
            .available_providers
            .iter()
            .find(|p| p.name == name)
            .map(|p| p.needs_api_key)
            .unwrap_or(true);
        if !needs_key {
            app.provider = name.clone();
            app.add_system_message(format!("Provider: {} (local, no key needed)", name));
            return;
        }
        app.connect_target = Some(name.clone());
        app.api_key_input.clear();
        app.active_modal = Some(AppModal::ApiKeyPrompt);
        return;
    }
    app.provider_filter.clear();
    app.provider_picker_index = 0;
    app.active_modal = Some(AppModal::ConnectPicker);
}

pub static CMD_CONNECT: Command = Command {
    name: "/connect",
    aliases: &[],
    description: "Connect an LLM provider (save API key)",
    category: CommandCategory::Agent,
};
