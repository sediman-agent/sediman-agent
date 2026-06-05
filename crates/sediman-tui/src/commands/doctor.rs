use sediman_tui_core::command::{Command, CommandCategory};

use crate::app::{App, AppModal, DoctorCheck, DoctorInstallState, DoctorStatus};

pub static CMD_DOCTOR: Command = Command {
    name: "/doctor",
    aliases: &[],
    description: "Diagnose & install dependencies",
    category: CommandCategory::Utilities,
};

pub async fn handle_doctor(app: &mut App, _args: &str) {
    let checks = run_all_checks(app).await;
    app.modals.active = Some(AppModal::Doctor {
        checks,
        cursor: 0,
        scroll: 0,
        install_state: DoctorInstallState::Idle,
        install_output: Vec::new(),
        filter: String::new(),
        search_active: false,
    });
}

pub async fn run_all_checks(app: &App) -> Vec<DoctorCheck> {
    let bridge = &app.connection.bridge;
    let provider = app.provider.clone();
    let provider_for_ai = provider.clone();
    let coder_backend = app.agent.coder_backend.clone();

    let (browser, ai_llm, tools, coders, python, system) = tokio::join!(
        check_browser(),
        check_ai_llm(bridge, &provider_for_ai),
        check_tools(),
        check_coders(&coder_backend),
        check_python(),
        check_system(bridge),
    );

    let mut checks = Vec::new();
    checks.extend(browser);
    checks.extend(ai_llm);
    checks.extend(tools);
    checks.extend(coders);
    checks.extend(python);
    checks.extend(system);
    checks
}

pub async fn run_category_check(category: &str, bridge: &sediman_tui_bridge::ApiClient, provider: &str, coder_backend: &str) -> Vec<DoctorCheck> {
    match category {
        "Browser" => check_browser().await,
        "AI & LLM" => check_ai_llm(bridge, provider).await,
        "Tools" => check_tools().await,
        "Coder Backends" => check_coders(coder_backend).await,
        "Python" => check_python().await,
        "System" => check_system(bridge).await,
        _ => vec![],
    }
}

async fn check_browser() -> Vec<DoctorCheck> {
    let mut result = Vec::new();

    let chrome = find_chrome();
    match chrome {
        Some(path) => result.push(DoctorCheck {
            category: "Browser".into(),
            name: "Chrome/Chromium".into(),
            status: DoctorStatus::Pass,
            message: format!("installed ({})", path),
            optional: false,
            install_cmd: None,
        }),
        None => result.push(DoctorCheck {
            category: "Browser".into(),
            name: "Chrome/Chromium".into(),
            status: DoctorStatus::Fail,
            message: "not found".into(),
            optional: false,
            install_cmd: Some(chrome_install_cmd()),
        }),
    }

    match which_fast("playwright") {
        Some(_) => result.push(DoctorCheck {
            category: "Browser".into(),
            name: "Playwright".into(),
            status: DoctorStatus::Pass,
            message: "installed".into(),
            optional: false,
            install_cmd: None,
        }),
        None => result.push(DoctorCheck {
            category: "Browser".into(),
            name: "Playwright".into(),
            status: DoctorStatus::Warn,
            message: "not found (bundled via Python)".into(),
            optional: true,
            install_cmd: None,
        }),
    }

    let pw_drivers = std::path::Path::new(&std::env::var("HOME").unwrap_or_default())
        .join(".cache")
        .join("ms-playwright");
    if pw_drivers.exists() {
        result.push(DoctorCheck {
            category: "Browser".into(),
            name: "Playwright drivers".into(),
            status: DoctorStatus::Pass,
            message: "installed".into(),
            optional: false,
            install_cmd: None,
        });
    } else {
        result.push(DoctorCheck {
            category: "Browser".into(),
            name: "Playwright drivers".into(),
            status: DoctorStatus::Fail,
            message: "not installed".into(),
            optional: false,
            install_cmd: Some("uv run playwright install chromium".into()),
        });
    }

    result
}

async fn check_ai_llm(bridge: &sediman_tui_bridge::ApiClient, provider: &str) -> Vec<DoctorCheck> {
    let mut result = Vec::new();

    let providers = bridge.list_providers().await.unwrap_or_default();
    let current_provider = providers.iter().find(|p| p.name == provider);

    let key_status = check_provider_api_key(provider, current_provider);
    result.push(key_status);

    if let Some(pi) = current_provider {
        if pi.category == "local" {
            result.push(check_local_provider(provider, pi));
        }
    }

    match bridge.status().await {
        Ok(status) => result.push(DoctorCheck {
            category: "AI & LLM".into(),
            name: "Backend server".into(),
            status: DoctorStatus::Pass,
            message: format!("ok (uptime {}s)", status.uptime_secs),
            optional: false,
            install_cmd: None,
        }),
        Err(_) => result.push(DoctorCheck {
            category: "AI & LLM".into(),
            name: "Backend server".into(),
            status: DoctorStatus::Fail,
            message: "not reachable".into(),
            optional: false,
            install_cmd: None,
        }),
    }

    result
}

fn check_provider_api_key(provider: &str, current_provider: Option<&sediman_tui_bridge::ProviderInfo>) -> DoctorCheck {
    let pi = match current_provider {
        Some(p) => p,
        None => {
            let has_any = check_any_api_key();
            return DoctorCheck {
                category: "AI & LLM".into(),
                name: "API key".into(),
                status: if has_any { DoctorStatus::Pass } else { DoctorStatus::Fail },
                message: if has_any {
                    format!("configured ({})", provider)
                } else {
                    "not set — use /provider".into()
                },
                optional: false,
                install_cmd: None,
            };
        }
    };

    if !pi.needs_api_key {
        return DoctorCheck {
            category: "AI & LLM".into(),
            name: "API key".into(),
            status: DoctorStatus::Pass,
            message: format!("{} (no key needed)", provider),
            optional: false,
            install_cmd: None,
        };
    }

    if pi.has_key {
        return DoctorCheck {
            category: "AI & LLM".into(),
            name: "API key".into(),
            status: DoctorStatus::Pass,
            message: format!("configured ({})", provider),
            optional: false,
            install_cmd: None,
        };
    }

    let env_key = format!("{}_API_KEY", provider.to_uppercase().replace('-', "_"));
    if std::env::var(&env_key).is_ok() {
        return DoctorCheck {
            category: "AI & LLM".into(),
            name: "API key".into(),
            status: DoctorStatus::Pass,
            message: format!("configured ({}, via {})", provider, env_key),
            optional: false,
            install_cmd: None,
        };
    }

    if provider != "openai" && std::env::var("OPENAI_API_KEY").is_ok() {
        return DoctorCheck {
            category: "AI & LLM".into(),
            name: "API key".into(),
            status: DoctorStatus::Warn,
            message: format!("using OPENAI_API_KEY fallback for {}", provider),
            optional: false,
            install_cmd: None,
        };
    }

    DoctorCheck {
        category: "AI & LLM".into(),
        name: "API key".into(),
        status: DoctorStatus::Fail,
        message: format!("not set — set {} or use /provider", env_key),
        optional: false,
        install_cmd: None,
    }
}

fn check_local_provider(provider: &str, _pi: &sediman_tui_bridge::ProviderInfo) -> DoctorCheck {
    let url = match provider {
        "ollama" => "http://localhost:11434/api/tags",
        "lmstudio" => "http://localhost:1234/v1/models",
        "vllm" => "http://localhost:8000/v1/models",
        "sglang" => "http://localhost:30000/v1/models",
        "llamacpp" => "http://localhost:8081/health",
        _ => {
            return DoctorCheck {
                category: "AI & LLM".into(),
                name: format!("{} daemon", provider),
                status: DoctorStatus::Warn,
                message: "unknown local provider".into(),
                optional: false,
                install_cmd: None,
            };
        }
    };

    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build();
    let reachable = runtime.map(|rt| rt.block_on(async {
        tokio::process::Command::new("curl")
            .args(["-sf", url, "-o", "/dev/null"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false)
    })).unwrap_or(false);

    if reachable {
        DoctorCheck {
            category: "AI & LLM".into(),
            name: format!("{} server", provider),
            status: DoctorStatus::Pass,
            message: "running".into(),
            optional: false,
            install_cmd: None,
        }
    } else {
        let start_cmd = match provider {
            "ollama" => "ollama serve",
            "lmstudio" => "open -a 'LM Studio'",
            _ => &format!("start your {} server", provider),
        };
        DoctorCheck {
            category: "AI & LLM".into(),
            name: format!("{} server", provider),
            status: DoctorStatus::Fail,
            message: format!("not running — {}", start_cmd),
            optional: false,
            install_cmd: Some(start_cmd.to_string()),
        }
    }
}

async fn check_tools() -> Vec<DoctorCheck> {
    let mut result = Vec::new();

    let docker_found = which_fast("docker").is_some();

    let tools: Vec<(&str, bool, String)> = vec![
        ("git", false, git_install_cmd()),
        ("uv", false, "curl -LsSf https://astral.sh/uv/install.sh | sh".into()),
        ("rg", false, rg_install_cmd()),
        ("curl", false, curl_install_cmd()),
        ("docker", false, docker_install_cmd()),
        ("node", true, node_install_cmd()),
        ("npm", true, npm_install_cmd()),
        ("pnpm", true, "npm install -g pnpm".into()),
        ("bun", true, "curl -fsSL https://bun.sh/install | bash".into()),
        ("gh", true, gh_install_cmd()),
        ("fd", true, fd_install_cmd()),
        ("jq", true, jq_install_cmd()),
        ("make", true, make_install_cmd()),
        ("gcc", true, gcc_install_cmd()),
        ("cargo", true, cargo_install_cmd()),
        ("go", true, go_install_cmd()),
        ("cmake", true, cmake_install_cmd()),
        ("aider", true, aider_install_cmd()),
        ("ffmpeg", true, ffmpeg_install_cmd()),
    ];

    for (name, optional, install) in tools {
        match which_fast(name) {
            Some(path) => result.push(DoctorCheck {
                category: "Tools".into(),
                name: name.to_string(),
                status: DoctorStatus::Pass,
                message: if path.len() < 50 {
                    format!("installed ({})", path)
                } else {
                    "installed".into()
                },
                optional,
                install_cmd: None,
            }),
            None => result.push(DoctorCheck {
                category: "Tools".into(),
                name: name.to_string(),
                status: if optional { DoctorStatus::Warn } else { DoctorStatus::Fail },
                message: if optional { "not found (optional)".into() } else { "not found".into() },
                optional,
                install_cmd: Some(install.to_string()),
            }),
        }
    }

    if docker_found {
        match check_docker_daemon_async().await {
            Some(running) => result.push(DoctorCheck {
                category: "Tools".into(),
                name: "Docker daemon".into(),
                status: if running { DoctorStatus::Pass } else { DoctorStatus::Fail },
                message: if running { "running".into() } else { "not running — start Docker".into() },
                optional: false,
                install_cmd: if running { None } else { Some(docker_start_cmd()) },
            }),
            None => {}
        }
    }

    result
}

async fn check_coders(current_backend: &str) -> Vec<DoctorCheck> {
    let mut result = Vec::new();

    let coders: Vec<(&str, &str, String)> = vec![
        ("claude", "claude-code", "npm install -g @anthropic-ai/claude-code".into()),
        ("codex", "codex", "npm install -g @openai/codex".into()),
        ("opencode", "opencode", "curl -fsSL https://opencode.ai/install | sh".into()),
    ];

    for (binary, backend_name, install) in coders {
        let is_current = current_backend == backend_name;
        match which_fast(binary) {
            Some(path) => {
                let mut msg = if path.len() < 50 {
                    format!("installed ({})", path)
                } else {
                    "installed".into()
                };
                if is_current {
                    msg.push_str(" (current)");
                }
                result.push(DoctorCheck {
                    category: "Coder Backends".into(),
                    name: backend_name.to_string(),
                    status: DoctorStatus::Pass,
                    message: msg,
                    optional: true,
                    install_cmd: None,
                });
            }
            None => {
                let mut msg = "not installed".to_string();
                if is_current {
                    msg.push_str(" (current — missing!)");
                }
                result.push(DoctorCheck {
                    category: "Coder Backends".into(),
                    name: backend_name.to_string(),
                    status: if is_current { DoctorStatus::Fail } else { DoctorStatus::Warn },
                    message: msg,
                    optional: true,
                    install_cmd: Some(install),
                });
            }
        }
    }

    result.push(DoctorCheck {
        category: "Coder Backends".into(),
        name: "internal".into(),
        status: if current_backend == "internal" { DoctorStatus::Pass } else { DoctorStatus::Pass },
        message: if current_backend == "internal" {
            "built-in (current)".into()
        } else {
            "built-in".into()
        },
        optional: false,
        install_cmd: None,
    });

    result
}

async fn check_python() -> Vec<DoctorCheck> {
    let mut result = Vec::new();

    match get_python_version_async().await {
        Some(ver) => {
            let ok = parse_python_version(&ver)
                .map(|(major, minor)| major == 3 && minor >= 11)
                .unwrap_or(false);
            result.push(DoctorCheck {
                category: "Python".into(),
                name: "Python 3.11+".into(),
                status: if ok { DoctorStatus::Pass } else { DoctorStatus::Fail },
                message: if ok { format!("installed ({})", ver) } else { format!("{} — need 3.11+", ver) },
                optional: false,
                install_cmd: if ok { None } else { Some(python_install_cmd()) },
            });
        }
        None => result.push(DoctorCheck {
            category: "Python".into(),
            name: "Python 3.11+".into(),
            status: DoctorStatus::Fail,
            message: "not found".into(),
            optional: false,
            install_cmd: Some(python_install_cmd()),
        }),
    }

    match tokio::process::Command::new("python3")
        .arg("-c")
        .arg("import sediman")
        .output()
        .await
    {
        Ok(o) if o.status.success() => result.push(DoctorCheck {
            category: "Python".into(),
            name: "sediman package".into(),
            status: DoctorStatus::Pass,
            message: "installed".into(),
            optional: false,
            install_cmd: None,
        }),
        _ => result.push(DoctorCheck {
            category: "Python".into(),
            name: "sediman package".into(),
            status: DoctorStatus::Warn,
            message: "not importable".into(),
            optional: false,
            install_cmd: Some("uv pip install -e .".into()),
        }),
    }

    result
}

pub fn parse_python_version(s: &str) -> Option<(u32, u32)> {
    let version_str = s.strip_prefix("Python ")?;
    let mut parts = version_str.splitn(3, '.');
    let major: u32 = parts.next()?.parse().ok()?;
    let minor: u32 = parts.next()?.parse().ok()?;
    Some((major, minor))
}

async fn check_system(bridge: &sediman_tui_bridge::ApiClient) -> Vec<DoctorCheck> {
    let mut result = Vec::new();

    let home = std::env::var("HOME").unwrap_or_default();
    let config_dir = std::path::Path::new(&home).join(".terminator");
    if config_dir.exists() {
        result.push(DoctorCheck {
            category: "System".into(),
            name: "Config directory".into(),
            status: DoctorStatus::Pass,
            message: "~/.terminator/".to_string(),
            optional: false,
            install_cmd: None,
        });
    } else {
        result.push(DoctorCheck {
            category: "System".into(),
            name: "Config directory".into(),
            status: DoctorStatus::Warn,
            message: "~/.terminator/ not found".to_string(),
            optional: false,
            install_cmd: Some("mkdir -p ~/.terminator".into()),
        });
    }

    let connected = bridge.is_connected().await;
    result.push(DoctorCheck {
        category: "System".into(),
        name: "Unix socket".into(),
        status: if connected { DoctorStatus::Pass } else { DoctorStatus::Fail },
        message: if connected { "connected".into() } else { "not connected".into() },
        optional: false,
        install_cmd: None,
    });

    match get_disk_space_async().await {
        Some(space) => {
            let gb = space as f64 / 1_000_000_000.0;
            result.push(DoctorCheck {
                category: "System".into(),
                name: "Disk space".into(),
                status: if gb > 1.0 { DoctorStatus::Pass } else { DoctorStatus::Warn },
                message: format!("{:.1} GB available", gb),
                optional: false,
                install_cmd: None,
            });
        }
        None => result.push(DoctorCheck {
            category: "System".into(),
            name: "Disk space".into(),
            status: DoctorStatus::Pass,
            message: "unknown".into(),
            optional: true,
            install_cmd: None,
        }),
    }

    result
}

fn find_chrome() -> Option<String> {
    if cfg!(target_os = "macos") {
        let paths = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ];
        for p in &paths {
            if std::path::Path::new(p).exists() {
                return Some(p.to_string());
            }
        }
    }
    for name in &["google-chrome-stable", "google-chrome", "chromium-browser", "chromium"] {
        if let Some(p) = which_fast(name) {
            return Some(p);
        }
    }
    None
}

pub fn which_fast(name: &str) -> Option<String> {
    let path_var = std::env::var("PATH").ok()?;
    let separator = if cfg!(windows) { ';' } else { ':' };
    for dir in path_var.split(separator) {
        let candidate = std::path::Path::new(dir).join(name);
        if candidate.exists() {
            if candidate.is_file() || candidate.is_symlink() {
                return Some(candidate.to_string_lossy().to_string());
            }
        }
    }
    None
}

async fn get_python_version_async() -> Option<String> {
    tokio::process::Command::new("python3")
        .arg("--version")
        .output()
        .await
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
}

async fn get_disk_space_async() -> Option<u64> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/".into());
    let output = tokio::process::Command::new("df")
        .arg("-k")
        .arg(&home)
        .output()
        .await
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let line = text.lines().nth(1)?;
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() >= 4 {
        parts[3].parse::<u64>().ok().map(|kb| kb * 1024)
    } else {
        None
    }
}

async fn check_docker_daemon_async() -> Option<bool> {
    let output = tokio::process::Command::new("docker")
        .arg("info")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .await
        .ok()?;
    Some(output.success())
}

fn check_any_api_key() -> bool {
    let home = std::env::var("HOME").unwrap_or_default();
    let auth_file = std::path::Path::new(&home)
        .join(".terminator")
        .join("auth.json");
    if let Ok(data) = std::fs::read_to_string(&auth_file) {
        if let Ok(map) = serde_json::from_str::<serde_json::Value>(&data) {
            if let Some(obj) = map.as_object() {
                for (_k, v) in obj {
                    if let Some(s) = v.as_str() {
                        if !s.is_empty() {
                            return true;
                        }
                    }
                }
            }
        }
    }
    std::env::var("OPENAI_API_KEY").is_ok()
}

fn chrome_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install --cask google-chrome".into()
    } else if which_fast("apt").is_some() {
        "wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && apt install -y google-chrome-stable".into()
    } else if which_fast("dnf").is_some() {
        "dnf install -y google-chrome-stable".into()
    } else {
        "curl -LsSf https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/chrome.deb && sudo dpkg -i /tmp/chrome.deb".into()
    }
}

fn git_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "xcode-select --install".into()
    } else {
        "sudo apt install -y git".into()
    }
}

fn rg_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install ripgrep".into()
    } else if which_fast("apt").is_some() {
        "sudo apt install -y ripgrep".into()
    } else {
        "curl -LO https://github.com/BurntSushi/ripgrep/releases/download/14.1.1/ripgrep-14.1.1-x86_64-unknown-linux-musl.tar.gz && tar xzf ripgrep-14.1.1-x86_64-unknown-linux-musl.tar.gz && sudo cp ripgrep-14.1.1-x86_64-unknown-linux-musl/rg /usr/local/bin/".into()
    }
}

fn fd_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install fd".into()
    } else {
        "sudo apt install -y fd-find".into()
    }
}

fn node_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install node".into()
    } else {
        "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs".into()
    }
}

fn docker_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install --cask docker".into()
    } else {
        "curl -fsSL https://get.docker.com | sh".into()
    }
}

fn python_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install python@3.12".into()
    } else {
        "sudo apt install -y python3.12 python3.12-venv".into()
    }
}

fn docker_start_cmd() -> String {
    if cfg!(target_os = "macos") {
        "open -a Docker".into()
    } else {
        "sudo systemctl start docker".into()
    }
}

fn gh_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install gh".into()
    } else if which_fast("apt").is_some() {
        "curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y".into()
    } else {
        "sudo dnf install -y gh".into()
    }
}

fn aider_install_cmd() -> String {
    "uv pip install aider-install".into()
}

fn npm_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install node".into()
    } else {
        "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs".into()
    }
}

fn curl_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install curl".into()
    } else {
        "sudo apt install -y curl".into()
    }
}

fn jq_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install jq".into()
    } else {
        "sudo apt install -y jq".into()
    }
}

fn make_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "xcode-select --install".into()
    } else {
        "sudo apt install -y build-essential".into()
    }
}

fn gcc_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "xcode-select --install".into()
    } else {
        "sudo apt install -y gcc".into()
    }
}

fn cargo_install_cmd() -> String {
    "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y".into()
}

fn go_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install go".into()
    } else {
        "sudo apt install -y golang-go".into()
    }
}

fn cmake_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install cmake".into()
    } else {
        "sudo apt install -y cmake".into()
    }
}

fn ffmpeg_install_cmd() -> String {
    if cfg!(target_os = "macos") {
        "brew install ffmpeg".into()
    } else {
        "sudo apt install -y ffmpeg".into()
    }
}
