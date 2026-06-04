"""Tests for auth.py — corrupted file backup, key read/write."""

import json
import stat
from pathlib import Path

import pytest


@pytest.fixture
def temp_auth_file(monkeypatch, tmp_path):
    """Create a temp auth.json and patch AUTH_FILE to point to it."""
    import sediman.auth as auth_module
    original = auth_module.AUTH_FILE
    auth_file = tmp_path / "auth.json"
    auth_file.write_text("{}")
    auth_module.AUTH_FILE = auth_file
    yield auth_file
    auth_module.AUTH_FILE = original


def test_backup_on_corrupted_json(temp_auth_file):
    """Corrupted JSON should rename the file to .corrupted.<ts> and return empty dict."""
    from sediman.auth import _read_store

    temp_auth_file.write_text("{invalid json [[[")
    assert temp_auth_file.exists()

    result = _read_store()

    assert result == {}
    assert not temp_auth_file.exists(), "Corrupted file should be moved"
    backup_files = list(temp_auth_file.parent.glob("auth.json.corrupted.*"))
    assert len(backup_files) >= 1, "Backup file should exist"


def test_backup_file_contains_original_data(temp_auth_file):
    """Backup should preserve the original corrupted content."""
    from sediman.auth import _read_store

    original = '{invalid'
    temp_auth_file.write_text(original)

    _read_store()

    backup_files = list(temp_auth_file.parent.glob("auth.json.corrupted.*"))
    assert len(backup_files) >= 1
    assert backup_files[0].read_text() == original


def test_read_write_roundtrip(temp_auth_file):
    """Normal read/write should work correctly."""
    from sediman.auth import (
        _read_store,
        _write_store,
        get_key,
        has_key,
        list_keys,
        set_key,
    )

    set_key("openai", "sk-test123")
    assert has_key("openai")
    assert get_key("openai") == "sk-test123"
    assert "openai" in list_keys()

    keys = list_keys()
    assert keys["openai"]["type"] == "api"
    assert "added_at" in keys["openai"]


def test_remove_key(temp_auth_file):
    """Removing a key should work."""
    from sediman.auth import get_key, has_key, remove_key, set_key

    set_key("openai", "sk-test")
    assert has_key("openai")

    assert remove_key("openai")
    assert not has_key("openai")
    assert get_key("openai") is None

    # Removing non-existent key returns False
    assert not remove_key("nonexistent")


def test_list_keys_empty(temp_auth_file):
    """Empty store should return empty dict."""
    from sediman.auth import list_keys

    assert list_keys() == {}


def test_ensure_auth_file_creates_file(monkeypatch, tmp_path):
    """_ensure_auth_file should create file with correct permissions."""
    import sediman.auth as auth_module
    from sediman.auth import _ensure_auth_file

    original = auth_module.AUTH_FILE
    auth_file = tmp_path / "auth.json"
    auth_module.AUTH_FILE = auth_file
    try:
        result = _ensure_auth_file()
        assert result == auth_file
        assert auth_file.exists()
        content = auth_file.read_text()
        assert content.strip() == "{}"
        perms = stat.S_IMODE(auth_file.stat().st_mode)
        assert perms == stat.S_IRUSR | stat.S_IWUSR
    finally:
        auth_module.AUTH_FILE = original
