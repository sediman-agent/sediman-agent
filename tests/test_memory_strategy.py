"""Test BaseMemoryStrategy ABC compliance."""

import pytest

from sediman.memory.strategy import BaseMemoryStrategy, MemoryEntry, MemoryTarget, MemoryType


class TestBaseMemoryStrategyABC:
    """Test that BaseMemoryStrategy ABC enforces interface compliance."""

    def test_cannot_instantiate_abc(self):
        """ABC should raise TypeError when instantiated directly."""
        with pytest.raises(TypeError):
            BaseMemoryStrategy()

    def test_incomplete_subclass_raises_typeerror(self):
        """Subclass missing required methods should raise TypeError."""
        class IncompleteStrategy(BaseMemoryStrategy):
            @staticmethod
            def name() -> str:
                return "incomplete"

        with pytest.raises(TypeError):
            IncompleteStrategy()

    def test_concrete_subclass_works(self):
        """A complete subclass should be instantiable."""
        class ConcreteStrategy(BaseMemoryStrategy):
            @staticmethod
            def name() -> str:
                return "concrete"

            async def initialize(self) -> None:
                pass

            def write(self, target: str, content: str, **metadata) -> bool:
                return True

            def search(self, query: str, limit: int = 5) -> list[MemoryEntry]:
                return []

            def replace(self, target: str, old_content: str, new_content: str) -> bool:
                return True

            def remove(self, target: str, content: str) -> bool:
                return True

            def context(self, task: str, max_chars: int = 1500) -> str:
                return ""

        strategy = ConcreteStrategy()
        assert strategy.name() == "concrete"
        assert strategy.write("memory", "test") is True
        assert strategy.search("test") == []
        assert strategy.replace("memory", "old", "new") is True
        assert strategy.remove("memory", "test") is True
        assert strategy.context("task") == ""


class TestMemoryEntry:
    """Test MemoryEntry dataclass."""

    def test_memory_entry_creation(self):
        """MemoryEntry should create with defaults."""
        entry = MemoryEntry(content="test entry")
        assert entry.content == "test entry"
        assert entry.target == MemoryTarget.MEMORY
        assert entry.type == MemoryType.FACT
        assert entry.source == "agent"
        assert entry.score == 0.0

    def test_memory_entry_with_values(self):
        """MemoryEntry should accept all fields."""
        entry = MemoryEntry(
            content="test",
            target=MemoryTarget.USER,
            type=MemoryType.PREFERENCE,
            source="manual",
            score=0.9,
        )
        assert entry.content == "test"
        assert entry.target == MemoryTarget.USER
        assert entry.type == MemoryType.PREFERENCE
        assert entry.source == "manual"
        assert entry.score == 0.9

    def test_memory_entry_to_dict(self):
        """MemoryEntry should convert to dict."""
        entry = MemoryEntry(
            content="test",
            target=MemoryTarget.USER,
            type=MemoryType.PREFERENCE,
        )
        d = entry.to_dict()
        assert d["content"] == "test"
        assert d["target"] == "user"
        assert d["type"] == "preference"


class TestMemoryEnums:
    """Test MemoryTarget and MemoryType enums."""

    def test_memory_target_values(self):
        """MemoryTarget enum should have correct values."""
        assert MemoryTarget.MEMORY.value == "memory"
        assert MemoryTarget.USER.value == "user"

    def test_memory_type_values(self):
        """MemoryType enum should have correct values."""
        assert MemoryType.FACT.value == "fact"
        assert MemoryType.PROCEDURE.value == "procedure"
        assert MemoryType.EPISODIC.value == "episodic"
        assert MemoryType.PREFERENCE.value == "preference"
