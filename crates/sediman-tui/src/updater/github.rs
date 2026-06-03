//! GitHub API client for checking releases.

use anyhow::Result;
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;

use super::Release;

#[derive(Deserialize)]
#[allow(dead_code)]
struct GitHubRelease {
    tag_name: String,
    name: String,
    body: Option<String>,
    published_at: String,
    assets: Vec<GitHubAsset>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

const GITHUB_API_BASE: &str = "https://api.github.com/repos/sediman-agent/OpenSkynet";

/// Check for updates from GitHub releases.
pub async fn check_for_update() -> Result<Option<Release>> {
    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;

    let resp = client.get(format!("{}/releases/latest", GITHUB_API_BASE))
        .header("User-Agent", "sediman-tui")
        .send()
        .await?;

    if !resp.status().is_success() {
        return Ok(None);
    }

    let github_release: GitHubRelease = resp.json().await?;

    let tag_name = github_release.tag_name;
    let version = tag_name.strip_prefix('v').unwrap_or(&tag_name);
    let current = env!("CARGO_PKG_VERSION");

    // Compare versions
    if version_gt(version, current) {
        Ok(Some(Release {
            tag_name: tag_name.clone(),
            name: github_release.name,
            body: github_release.body.unwrap_or_else(|| {
                format!("Release {}", tag_name)
            }),
            published_at: github_release.published_at,
        }))
    } else {
        Ok(None)
    }
}

/// Simple version comparison - returns true if a > b
fn version_gt(a: &str, b: &str) -> bool {
    let parts_a: Vec<u32> = a.split('.')
        .map(|s| s.parse().unwrap_or(0))
        .collect();
    let parts_b: Vec<u32> = b.split('.')
        .map(|s| s.parse().unwrap_or(0))
        .collect();

    for i in 0..3 {
        let a_val = parts_a.get(i).unwrap_or(&0);
        let b_val = parts_b.get(i).unwrap_or(&0);
        if a_val > b_val {
            return true;
        }
        if a_val < b_val {
            return false;
        }
    }
    false
}
