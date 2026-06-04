use sediman_tui_core::command::{Command, CommandCategory};

use crate::app::{App, AppModal, ModalLine};

fn checkpoints_dir() -> std::path::PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    std::path::PathBuf::from(format!("{}/.terminator/checkpoints", home))
}

fn scan_local_checkpoints() -> Vec<(String, String, String)> {
    let cp_dir = checkpoints_dir();
    let mut results = Vec::new();
    let Ok(entries) = std::fs::read_dir(&cp_dir) else {
        return results;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("meta") {
            continue;
        }
        let cp_id = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        let tar_path = path.with_extension("tar.gz");
        if !tar_path.exists() {
            continue;
        }
        let target_dir = std::fs::read_to_string(&path)
            .unwrap_or_default()
            .lines()
            .next()
            .unwrap_or("unknown")
            .to_string();
        let modified = tar_path.metadata().ok().and_then(|m| m.modified().ok());
        let time_str = modified.map(|t| {
            let secs = t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
            format!("{}", secs)
        }).unwrap_or_default();
        results.push((cp_id, target_dir, time_str));
    }
    results.sort_by(|a, b| b.2.cmp(&a.2));
    results
}

pub async fn handle_checkpoint(app: &mut App, _args: &str) {
    let checkpoints = scan_local_checkpoints();
    if checkpoints.is_empty() {
        app.add_system_message("No checkpoints yet.".into());
        return;
    }

    let mut lines = vec![ModalLine::heading("  Checkpoints")];
    for (cp_id, target_dir, _) in checkpoints.iter().take(30) {
        lines.push(ModalLine::normal(format!("  {}  {}", cp_id, target_dir)));
    }

    app.active_modal = Some(AppModal::Info {
        title: "Checkpoints".into(),
        lines,
        scroll: 0,
    });
}

pub async fn handle_checkpoint_create(app: &mut App, args: &str) {
    let args = args.trim();
    if args.is_empty() {
        app.add_system_message("Usage: /checkpoint-create <dir> [--name=<name>]".into());
        return;
    }

    let target = args.split_whitespace().next().unwrap_or(".");
    let target_path = std::path::Path::new(target);
    if !target_path.exists() {
        app.add_error_message(format!("Directory not found: {}", target));
        return;
    }

    match app.bridge.call::<serde_json::Value>("checkpoint.create", serde_json::json!({"target_dir": target})).await {
        Ok(result) => {
            let id = result.get("id").and_then(|v| v.as_str()).unwrap_or("?");
            app.add_system_message(format!("Created checkpoint {}", id));
        }
        Err(e) => app.add_error_message(format!("Failed to create checkpoint: {}", e)),
    }
}

pub async fn handle_checkpoint_revert(app: &mut App, args: &str) {
    let args = args.trim();
    if args.is_empty() {
        app.add_system_message("Usage: /checkpoint-revert <dir> <id>".into());
        return;
    }

    let parts: Vec<&str> = args.split_whitespace().collect();
    if parts.len() < 2 {
        app.add_system_message("Usage: /checkpoint-revert <dir> <id>".into());
        return;
    }

    let target = parts[0];
    let cp_id = parts[1];

    match app.bridge.call::<serde_json::Value>("checkpoint.revert", serde_json::json!({"checkpoint_id": cp_id, "target_dir": target})).await {
        Ok(_) => app.add_system_message(format!("Reverted to checkpoint {}", cp_id)),
        Err(e) => app.add_error_message(format!("Failed to revert: {}", e)),
    }
}

pub async fn handle_rewind(app: &mut App, args: &str) {
    let cp_id = args.trim();
    if cp_id.is_empty() {
        app.add_system_message("Usage: /rewind <checkpoint-id>".into());
        app.add_system_message("Use /checkpoint to list IDs.".into());
        return;
    }

    let cwd = std::env::current_dir()
        .map(|p| p.display().to_string())
        .unwrap_or_else(|_| ".".into());

    match app.bridge.call::<serde_json::Value>("checkpoint.revert", serde_json::json!({"checkpoint_id": cp_id, "target_dir": cwd})).await {
        Ok(_) => app.add_system_message(format!("Reverted to checkpoint {}", cp_id)),
        Err(e) => app.add_error_message(format!("Failed to rewind: {}", e)),
    }
}

pub async fn handle_branch(app: &mut App, args: &str) {
    let args = args.trim();
    if args.is_empty() {
        app.add_system_message("Usage: /branch <name> [dir]".into());
        return;
    }

    let parts: Vec<&str> = args.split_whitespace().collect();
    let name = parts[0];
    let target = if parts.len() > 1 {
        parts[1].to_string()
    } else {
        std::env::current_dir()
            .map(|p| p.display().to_string())
            .unwrap_or_else(|_| ".".into())
    };

    let target_path = std::path::Path::new(&target);
    if !target_path.exists() {
        app.add_error_message(format!("Directory not found: {}", target));
        return;
    }

    match app.bridge.call::<serde_json::Value>("checkpoint.create", serde_json::json!({"target_dir": target, "name": name})).await {
        Ok(result) => {
            let id = result.get("id").and_then(|v| v.as_str()).unwrap_or("?");
            app.add_system_message(format!("Branch saved: {} ({})", name, id));
        }
        Err(e) => app.add_error_message(format!("Failed to create branch: {}", e)),
    }
}

pub async fn handle_branches(app: &mut App, args: &str) {
    handle_checkpoint(app, args).await;
}

pub static CMD_CHECKPOINT: Command = Command {
    name: "/checkpoint",
    aliases: &[],
    description: "List filesystem checkpoints",
    category: CommandCategory::General,
};

pub static CMD_CHECKPOINT_CREATE: Command = Command {
    name: "/checkpoint-create",
    aliases: &[],
    description: "Create a checkpoint: /checkpoint-create <dir> [--name=<name>]",
    category: CommandCategory::General,
};

pub static CMD_CHECKPOINT_REVERT: Command = Command {
    name: "/checkpoint-revert",
    aliases: &[],
    description: "Revert directory to checkpoint: /checkpoint-revert <dir> <id>",
    category: CommandCategory::General,
};

pub static CMD_REWIND: Command = Command {
    name: "/rewind",
    aliases: &[],
    description: "Revert current directory to a checkpoint",
    category: CommandCategory::General,
};

pub static CMD_BRANCH: Command = Command {
    name: "/branch",
    aliases: &[],
    description: "Save named checkpoint: /branch <name> [dir]",
    category: CommandCategory::General,
};

pub static CMD_BRANCHES: Command = Command {
    name: "/branches",
    aliases: &[],
    description: "List saved branch checkpoints",
    category: CommandCategory::General,
};
