# Changelog

All notable changes to OpenSkynet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.1] - 2026-05-30

### Added

- 200 curated skills from clawskills.sh (OpenClaw Skills Registry)
- Skills indexed with vector embeddings for semantic search (471 total skills)
- `scripts/import_clawskills.py` for importing skills from external registries
- clawskills.sh added as a source in the skill indexer
- Discord community link

### Fixed

- Install script GitHub repo reference (`sediman-agent/OpenSkynet`)
- CONTRIBUTING.md clone URL
- README.md broken issue links
- Org name consistency across all files (`sediman-agent`)

## [0.1.0] - 2026-05-15

### Added

- Initial release
- Think-act-observe-reflect agent loop
- Browser automation via Playwright + CloakBrowser stealth mode
- Self-healing skills system with LLM-based repair
- Skill learning from task execution traces
- Persistent memory with vector embeddings and SQLite FTS5
- 24/7 cron scheduling via APScheduler
- Rust TUI (sediman-tui) with GPU rendering support
- FastAPI REST/WebSocket API server
- JSON-RPC over Unix socket for IPC
- Discord and Telegram bot integrations
- Subagent parallelization with isolated browser contexts
- Context compression for long conversations
- Recording manager for screen capture and trace-to-skill conversion
- Skills Hub for community skill browsing and installation
- Coding subagent for code generation tasks
- 271 bundled skills from 11 sources
- Docker and docker-compose support
- One-line installer (`curl -fsSL https://get.sediman.ai | bash`)
