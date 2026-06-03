use sediman_tui_core::command::{Command, CommandCategory};

use crate::app::App;

pub async fn handle_models(app: &mut App, args: &str) {
    if !args.is_empty() {
        let (new_provider, new_model) = if let Some(idx) = args.find('/') {
            (args[..idx].to_string(), Some(args[idx + 1..].to_string()))
        } else {
            (app.provider.clone(), Some(args.to_string()))
        };

        let base_url = app
            .available_providers
            .iter()
            .find(|p| p.name == new_provider)
            .and_then(|p| p.default_base_url.clone());

        let model_str = new_model.as_deref().unwrap_or("default");
        if let Err(e) = app.bridge.switch_model(&new_provider, Some(model_str), base_url.as_deref()).await {
            app.add_error_message(format!("Failed to switch model: {}", e));
            return;
        }

        app.provider = new_provider;
        app.model = new_model;
        if let Some(url) = base_url {
            app.base_url = Some(url);
        }
        if let Ok(providers) = app.bridge.list_providers().await {
            app.available_providers = providers;
        }
        if let Ok(models) = app.bridge.list_models(None).await {
            app.model_list = models;
        }

        // Save to config
        crate::commands::theming::save_config_now(app);

        app.add_system_message(format!("Switched to {}", app.display_model_id()));
        return;
    }
    app.open_model_dialog();
}

pub static CMD_MODELS: Command = Command {
    name: "/models",
    aliases: &[],
    description: "Search and select AI models",
    category: CommandCategory::Agent,
};
