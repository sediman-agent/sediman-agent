#!/usr/bin/env python3
"""Import top 200 skills from VoltAgent/awesome-openclaw-skills into skills/index.json.

Fetches all category markdown files, parses skill entries, ranks by category
popularity (proportional allocation), deduplicates against existing skills,
and merges into the index.

Usage:
    python scripts/import_clawskills.py
    python scripts/import_clawskills.py --top 200
    python scripts/import_clawskills.py --dry-run
"""
from __future__ import annotations

import json
import math
import re
import sys
import time
from pathlib import Path

import httpx

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INDEX_PATH = PROJECT_ROOT / "skills" / "index.json"

CATEGORIES = [
    "ai-and-llms",
    "apple-apps-and-services",
    "browser-and-automation",
    "calendar-and-scheduling",
    "clawdbot-tools",
    "cli-utilities",
    "coding-agents-and-ides",
    "communication",
    "data-and-analytics",
    "devops-and-cloud",
    "gaming",
    "git-and-github",
    "health-and-fitness",
    "image-and-video-generation",
    "ios-and-macos-development",
    "marketing-and-sales",
    "media-and-streaming",
    "moltbook",
    "notes-and-pkm",
    "pdf-and-documents",
    "personal-development",
    "productivity-and-tasks",
    "search-and-research",
    "security-and-passwords",
    "self-hosted-and-automation",
    "shopping-and-e-commerce",
    "smart-home-and-iot",
    "speech-and-transcription",
    "transportation",
    "web-and-frontend-development",
]

BASE_URL = "https://raw.githubusercontent.com/VoltAgent/awesome-openclaw-skills/main/categories/{cat}.md"

_SKILL_RE = re.compile(
    r"^- \[([^\]]+)\]\(https://clawskills\.sh/skills/([^)]+)\) - (.+)$",
    re.MULTILINE,
)


def _normalize_name(name: str) -> str:
    return re.sub(r"[\s_\-]+", "", name).lower()


def _category_display_name(cat_file: str) -> str:
    return cat_file.replace("-", " ").replace("and ", "& ").title()


async def fetch_category(client: httpx.AsyncClient, cat: str) -> list[dict]:
    url = BASE_URL.format(cat=cat)
    resp = await client.get(url)
    if resp.status_code != 200:
        print(f"  WARNING: {cat} returned {resp.status_code}")
        return []
    text = resp.text
    matches = _SKILL_RE.findall(text)
    skills = []
    for name, slug, description in matches:
        skills.append({
            "name": name,
            "slug": slug,
            "description": description.strip(),
            "category": _category_display_name(cat),
            "source": "clawskills.sh",
            "scope": "external",
            "path": "",
            "keywords": [],
        })
    return skills


async def fetch_all_categories() -> dict[str, list[dict]]:
    all_skills: dict[str, list[dict]] = {}
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        for cat in CATEGORIES:
            skills = await fetch_category(client, cat)
            all_skills[cat] = skills
            print(f"  {cat}: {len(skills)} skills")
    return all_skills


def select_top_skills(
    all_skills: dict[str, list[dict]],
    existing_names: set[str],
    top_n: int = 200,
) -> list[dict]:
    sorted_cats = sorted(all_skills.items(), key=lambda x: len(x[1]), reverse=True)
    total_available = sum(len(s) for s in all_skills.values())
    selected: list[dict] = []
    seen_names: set[str] = set()

    for cat, skills in sorted_cats:
        if not skills:
            continue
        share = len(skills) / total_available
        allocation = max(1, round(top_n * share))
        count = 0
        for skill in skills:
            norm = _normalize_name(skill["name"])
            if norm in existing_names or norm in seen_names:
                continue
            selected.append(skill)
            seen_names.add(norm)
            count += 1
            if count >= allocation:
                break
        if len(selected) >= top_n:
            break

    if len(selected) > top_n:
        selected = selected[:top_n]

    if len(selected) < top_n:
        for cat, skills in sorted_cats:
            for skill in skills:
                if len(selected) >= top_n:
                    break
                norm = _normalize_name(skill["name"])
                if norm in existing_names or norm in seen_names:
                    continue
                selected.append(skill)
                seen_names.add(norm)
            if len(selected) >= top_n:
                break

    return selected


def load_existing_index() -> tuple[list[dict], set[str]]:
    if not INDEX_PATH.exists():
        return [], set()
    raw = json.loads(INDEX_PATH.read_text())
    if isinstance(raw, dict):
        skills = raw.get("skills", [])
    else:
        skills = raw
    names = {_normalize_name(s.get("name", "")) for s in skills if s.get("name")}
    return skills, names


def merge_into_index(existing: list[dict], new_skills: list[dict]) -> dict:
    all_skills = existing + new_skills
    stats: dict[str, int] = {}
    for s in all_skills:
        src = s.get("source", "unknown")
        stats[src] = stats.get(src, 0) + 1
    return {
        "version": 2,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "stats": {
            "total": len(all_skills),
            "sources": stats,
        },
        "skills": all_skills,
    }


async def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Import top clawskills into index")
    parser.add_argument("--top", type=int, default=200, help="Number of skills to import")
    parser.add_argument("--dry-run", action="store_true", help="Don't write files")
    args = parser.parse_args()

    print("Loading existing index...")
    existing_skills, existing_names = load_existing_index()
    print(f"  Existing skills: {len(existing_skills)}")
    print(f"  Existing unique names: {len(existing_names)}")

    print("\nFetching categories from VoltAgent/awesome-openclaw-skills...")
    all_skills = await fetch_all_categories()
    total_fetched = sum(len(s) for s in all_skills.values())
    print(f"  Total fetched: {total_fetched}")

    print(f"\nSelecting top {args.top} skills (category-first, proportional)...")
    selected = select_top_skills(all_skills, existing_names, top_n=args.top)
    print(f"  Selected: {len(selected)}")

    if not selected:
        print("No new skills to add.")
        return

    print("\nSample of new skills:")
    for s in selected[:10]:
        print(f"  - {s['name']} [{s['category']}]")
    if len(selected) > 10:
        print(f"  ... and {len(selected) - 10} more")

    cat_breakdown: dict[str, int] = {}
    for s in selected:
        cat_breakdown[s["category"]] = cat_breakdown.get(s["category"], 0) + 1
    print("\nCategory breakdown:")
    for cat, count in sorted(cat_breakdown.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

    if args.dry_run:
        print("\nDRY RUN: Would add these skills to index.json")
        return

    print("\nMerging into index.json...")
    merged = merge_into_index(existing_skills, selected)
    INDEX_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False))
    print(f"  Written: {merged['stats']['total']} total skills")
    print(f"  Sources: {merged['stats']['sources']}")
    print("\nDone! Next step: run `python scripts/generate_skill_embeddings.py`")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
