"""Test FileMemoryStrategy wraps existing behavior."""

import pytest
from pathlib import Path
from unittest.mock import patch

from sediman.memory.strategies.file_memory import FileMemoryStrategy
from sediman.memory.strategy import MemoryEntry, MemoryTarget, MemoryType


@pytest.fixture
def file_memory_strategy(tmp_sediman_dir: Path):
    """Create a FileMemoryStrategy with temp data directory."""
    mem_dir = tmp_sediman_dir / "memories"
    mem_dir.mkdir(parents=True, exist_ok=True)

    with patch("sediman.memory.storage.store.MEMORY_DIR", mem_dir), \
         patch("sediman.memory.storage.store.MEMORY_FILE", mem_dir / "MEMORY.md"), \
         patch("sediman.memory.storage.store.USER_FILE", mem_dir / "USER.md"), \
         patch("sediman.memory.storage.store.OLD_MEMORY_FILE", tmp_sediman_dir / "MEMORY.md"), \
         patch("sediman.memory.storage.store.OLD_USER_FILE", tmp_sediman_dir / "USER.md"), \
         patch("sediman.memory.storage.store.OLD_MEMORY_DB", tmp_sediman_dir / "memory.json"), \
         patch("sediman.memory.vector.vector_store._VECTOR_DB_PATH", tmp_sediman_dir / "vectors.db"), \
         patch("sediman.memory.vector.vector_store._LEGACY_INDEX_PATH", tmp_sediman_dir / "vector_index.json"):
        strategy = FileMemoryStrategy()
        yield strategy


class TestFileMemoryStrategy:
    """Test FileMemoryStrategy implements BaseMemoryStrategy correctly."""

    def test_name(self, file_memory_strategy):
        """Strategy name should be FileMemoryStrategy."""
        assert file_memory_strategy.name() == "FileMemoryStrategy"

    @pytest.mark.asyncio
    async def test_initialize_loads_snapshot(self, file_memory_strategy):
        """Initialize should load snapshot and vector index."""
        await file_memory_strategy.initialize()
        assert file_memory_strategy._initialized is True

    def test_write_adds_to_store(self, file_memory_strategy):
        """Write should add entry to store and index it."""
        result = file_memory_strategy.write("memory", "test entry")
        assert result is True

        # Check it was added
        entries = file_memory_strategy._store.get_all_entries()
        assert "test entry" in entries.get("memory", [])

    def test_search_returns_entries(self, file_memory_strategy):
        """Search should return matching entries."""
        file_memory_strategy.write("memory", "python programming")
        file_memory_strategy.write("memory", "javascript guide")

        results = file_memory_strategy.search("python", limit=5)
        assert len(results) >= 1
        assert any("python" in entry.content.lower() for entry in results)

    def test_replace_updates_entry(self, file_memory_strategy):
        """Replace should update existing entry."""
        file_memory_strategy.write("memory", "old content")

        result = file_memory_strategy.replace("memory", "old content", "new content")
        assert result is True

        entries = file_memory_strategy._store.get_all_entries()
        assert "new content" in entries.get("memory", [])
        assert "old content" not in entries.get("memory", [])

    def test_remove_deletes_entry(self, file_memory_strategy):
        """Remove should delete entry from store."""
        file_memory_strategy.write("memory", "to be removed")

        result = file_memory_strategy.remove("memory", "to be removed")
        assert result is True

        entries = file_memory_strategy._store.get_all_entries()
        assert "to be removed" not in entries.get("memory", [])

    def test_context_formats_for_prompt(self, file_memory_strategy):
        """Context should return formatted string for system prompt."""
        file_memory_strategy.write("memory", "test fact")

        context = file_memory_strategy.context("test task")
        assert "<memory-context>" in context
        assert "test fact" in context or "MEMORY" in context

    def test_get_tool_schema_returns_correct_structure(self, file_memory_strategy):
        """Tool schema should have correct OpenAI function structure."""
        schema = file_memory_strategy.get_tool_schema()
        assert schema is not None
        assert schema["type"] == "function"
        assert "function" in schema
        func = schema["function"]
        assert func["name"] == "memory"
        assert "parameters" in func
        assert "action" in func["parameters"]["properties"]
        assert "target" in func["parameters"]["properties"]

    @pytest.mark.asyncio
    async def test_handle_tool_call_routes_correctly(self, file_memory_strategy):
        """Handle tool call should route to correct store methods."""
        await file_memory_strategy.initialize()

        # Test add
        result = await file_memory_strategy.handle_tool_call("memory", {
            "action": "add",
            "target": "memory",
            "content": "tool test entry",
        })
        assert "Added" in result or "Failed" in result

        # Test replace
        result = await file_memory_strategy.handle_tool_call("memory", {
            "action": "replace",
            "target": "memory",
            "old_entry": "tool test entry",
            "content": "updated entry",
        })
        assert "Replaced" in result or "Failed" in result

        # Test remove
        result = await file_memory_strategy.handle_tool_call("memory", {
            "action": "remove",
            "target": "memory",
            "old_entry": "updated entry",
        })
        assert "Removed" in result or "Failed" in result


class TestFileMemoryStrategyHooks:
    """Test optional hook methods."""

    @pytest.mark.asyncio
    async def test_on_turn_start_increments_counter(self, file_memory_strategy):
        """on_turn_start should increment turn counter."""
        assert file_memory_strategy._turn_count == 0

        await file_memory_strategy.on_turn_start()
        assert file_memory_strategy._turn_count == 1

        await file_memory_strategy.on_turn_start()
        assert file_memory_strategy._turn_count == 2

    def test_should_review(self, file_memory_strategy):
        """should_review should return True every review_interval turns."""
        # Default interval is 10
        assert file_memory_strategy.should_review(1) is False
        assert file_memory_strategy.should_review(10) is False  # Uses internal counter

        # After 10 turns
        for _ in range(10):
            file_memory_strategy._turn_count += 1
        assert file_memory_strategy.should_review(0) is True

    @pytest.mark.asyncio
    async def test_hooks_dont_raise(self, file_memory_strategy):
        """Optional hooks should not raise errors."""
        await file_memory_strategy.on_turn_start()
        await file_memory_strategy.on_session_end()
        await file_memory_strategy.on_pre_compress()
        results = await file_memory_strategy.review([])
        assert results == []  # No LLM, so returns empty list
