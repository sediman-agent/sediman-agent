from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import patch

import pytest


@pytest.fixture
def tmp_sediman_dir(tmp_path: Path):
    """Redirect data dir to a temp dir for all tests."""
    mem_dir = tmp_path / "memories"
    mem_dir.mkdir(parents=True, exist_ok=True)

    patches = [
        patch("sediman.store.db.DEFAULT_DATA_DIR", tmp_path),
        patch("sediman.memory.utils.prompt.MEMORY_FILE", tmp_path / "MEMORY.md"),
        patch("sediman.memory.utils.prompt.USER_FILE", tmp_path / "USER.md"),
        patch("sediman.memory.utils.prompt.MEMORY_DB", tmp_path / "memory.json"),
        patch("sediman.memory.utils.prompt.DATA_DIR", tmp_path),
        patch("sediman.memory.utils.prompt.CONTEXT_FILE", tmp_path / "CONTEXT.md"),
        patch("sediman.memory.storage.store.MEMORY_DIR", mem_dir),
        patch("sediman.memory.storage.store.MEMORY_FILE", mem_dir / "MEMORY.md"),
        patch("sediman.memory.storage.store.USER_FILE", mem_dir / "USER.md"),
        patch("sediman.memory.storage.store.OLD_MEMORY_FILE", tmp_path / "MEMORY.md"),
        patch("sediman.memory.storage.store.OLD_USER_FILE", tmp_path / "USER.md"),
        patch("sediman.memory.storage.store.OLD_MEMORY_DB", tmp_path / "memory.json"),
        patch("sediman.memory.vector.vector_store._VECTOR_DB_PATH", tmp_path / "vectors.db"),
        patch("sediman.memory.vector.vector_store._LEGACY_INDEX_PATH", tmp_path / "vector_index.json"),
        patch("sediman.agent.prompts.builder.SOUL_FILE", tmp_path / "SOUL.md"),
        patch("sediman.agent.prompts.builder.CONTEXT_FILE", tmp_path / "CONTEXT.md"),
        patch("sediman.agent.soul.SOUL_FILE", tmp_path / "SOUL.md"),
        patch("sediman.skills.engine.GLOBAL_SKILLS_DIR", tmp_path / "skills"),
        patch("sediman.scheduler.cron.JOBS_DIR", tmp_path / "cron"),
        patch("sediman.scheduler.cron.RESULTS_FILE", tmp_path / "cron" / "results.jsonl"),
        patch("sediman.browser.session.SESSION_DIR", tmp_path / "sessions"),
        patch("sediman.browser.session.DATA_DIR", tmp_path),
    ]

    with patches[0]:
        for p in patches[1:]:
            p.start()
        yield tmp_path
        for p in reversed(patches):
            p.stop()


@pytest.fixture(autouse=True)
def _clear_caches():
    yield
    try:
        from sediman.web.extract import clear_url_cache
        clear_url_cache()
    except Exception:
        pass


@pytest.fixture(autouse=True)
def _disable_opensandbox(monkeypatch):
    monkeypatch.setenv("SEDIMAN_OPENSANDBOX", "false")


@pytest.fixture
def tmp_db(tmp_sediman_dir: Path):
    """Initialize a fresh test database."""
    from sediman.store.db import init_db

    with patch("sediman.store.db.DEFAULT_DATA_DIR", tmp_sediman_dir):
        import asyncio
        asyncio.get_event_loop().run_until_complete(init_db())
    yield tmp_sediman_dir
