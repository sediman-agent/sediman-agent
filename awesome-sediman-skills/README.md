# Awesome Sediman Skills

A curated collection of skills and examples for [Sediman](https://github.com/sediman-agent/sediman-browse) — the self-improving browser agent.

## What are Sediman Skills?

Skills are reusable browser automation patterns that Sediman learns from watching you work. Once learned, they can be replayed, scheduled, and self-healed when pages change.

## Included Skills (471)

| Source | Count | Category |
|--------|-------|----------|
| Anthropic | 17 | Design, Art, API, Documentation |
| Cloudflare | 8 | Infrastructure, Workers, DNS |
| Cursor Plugins | 13 | IDE, Code Generation |
| Expo | 16 | Mobile Development |
| Hugging Face | 15 | ML/AI Models |
| Firecrawl | 5 | Web Scraping |
| Venice AI | 19 | Image Generation, AI |
| Browser Use | 6 | Browser Automation |
| Vercel | 1 | Frontend Deployment |
| Marketing Skills | 171 | SEO, Content, Social Media |
| ClawSkills.sh | 200 | Coding, DevOps, Search, Browser Automation |

## Quick Start

```bash
# Install Sediman
curl -fsSL https://get.sediman.ai | bash

# Browse available skills
sediman skill list

# Search skills
sediman skill search "stock price"

# Run a skill
sediman run "check AAPL stock price"
```

## Skill Format

Each skill is a markdown file with YAML frontmatter:

```markdown
---
name: my-skill
description: What this skill does
category: finance
when_to_use:
  - When user asks for X
pitfalls:
  - Thing to watch out for
verification:
  - Expected outcome
---

## Steps

1. Navigate to https://example.com
2. Extract the data
3. Return structured result
```

## Categories

- **Browser Automation** — web interaction, form filling, data extraction
- **Coding Agents & IDEs** — code generation, refactoring, testing
- **DevOps & Cloud** — deployment, monitoring, infrastructure
- **Search & Research** — web search, academic papers, data gathering
- **Productivity** — scheduling, email, task management
- **Finance** — stock prices, market data, reports
- **Marketing** — SEO, social media, content creation

## Contributing

Have a useful skill? We welcome contributions!

1. Fork [sediman-agent/sediman-browse](https://github.com/sediman-agent/sediman-browse)
2. Add your skill to `skills/<source>/<skill-name>/SKILL.md`
3. Open a PR

## License

Skills in this collection are from various sources. Each skill retains its original license. The collection itself is under [BSL-1.1](LICENSE).
