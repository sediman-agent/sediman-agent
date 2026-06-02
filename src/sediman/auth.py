"""Credentials store — persists API keys per provider in ~/.terminator/auth.json.

Modeled after opencode's auth system. File permissions are 0600 (user-only).
"""
from __future__ import annotations

import json
import os
import stat
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import structlog

from sediman.config import AUTH_FILE

logger = structlog.get_logger()


def _ensure_auth_file() -> Path:
    AUTH_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not AUTH_FILE.exists():
        AUTH_FILE.write_text("{}")
        os.chmod(AUTH_FILE, stat.S_IRUSR | stat.S_IWUSR)
    return AUTH_FILE


def _read_store() -> dict[str, Any]:
    try:
        _ensure_auth_file()
        data = AUTH_FILE.read_text()
        return json.loads(data) if data.strip() else {}
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("auth_store_read_error", error=str(e))
        return {}


def _write_store(data: dict[str, Any]) -> None:
    _ensure_auth_file()
    tmp = AUTH_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    os.chmod(tmp, stat.S_IRUSR | stat.S_IWUSR)
    tmp.replace(AUTH_FILE)


def get_key(provider: str) -> str | None:
    entry = _read_store().get(provider)
    if entry and isinstance(entry, dict):
        return entry.get("key")
    return None


def set_key(provider: str, key: str) -> None:
    data = _read_store()
    data[provider] = {
        "type": "api",
        "key": key,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_store(data)
    logger.info("auth_key_saved", provider=provider)


def remove_key(provider: str) -> bool:
    data = _read_store()
    if provider in data:
        del data[provider]
        _write_store(data)
        logger.info("auth_key_removed", provider=provider)
        return True
    return False


def list_keys() -> dict[str, dict[str, Any]]:
    return {k: v for k, v in _read_store().items() if isinstance(v, dict)}


def has_key(provider: str) -> bool:
    return get_key(provider) is not None
