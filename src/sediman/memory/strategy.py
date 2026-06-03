"""BaseMemoryStrategy — single interface for all memory implementations.

This module defines the abstract base class that all memory strategies must implement.
Following the pattern established in providers.py, we use ABC with @abstractmethod decorators.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional


class MemoryTarget(Enum):
    """Memory storage targets."""
    MEMORY = "memory"
    USER = "user"


class MemoryType(Enum):
    """Memory entry types."""
    FACT = "fact"
    PROCEDURE = "procedure"
    EPISODIC = "episodic"
    PREFERENCE = "preference"


@dataclass
class MemoryEntry:
    """A single memory entry with metadata.

    Matches MemoryEntryMeta fields plus relevance score from search.
    """
    content: str
    target: MemoryTarget = MemoryTarget.MEMORY
    type: MemoryType = MemoryType.FACT
    source: str = "agent"  # "agent", "manual", "system"
    created_at: float = 0.0
    accessed_at: float = 0.0
    access_count: int = 0
    score: float = 0.0  # Relevance score from search

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "content": self.content,
            "target": self.target.value,
            "type": self.type.value,
            "source": self.source,
            "created_at": self.created_at,
            "accessed_at": self.accessed_at,
            "access_count": self.access_count,
            "score": self.score,
        }


class BaseMemoryStrategy(ABC):
    """Single interface for all memory implementations.

    All strategies must implement the required methods. Optional hooks
    have default no-op implementations following the pattern in providers.py.

    Required methods define the core memory operations: write, search,
    replace, remove, and context formatting for system prompts.

    Optional hooks allow strategies to participate in agent lifecycle events
    (turn start, session end, compression) and provide optional features
    (LLM-based review, tool schemas).
    """

    # Required methods

    @staticmethod
    @abstractmethod
    def name() -> str:
        """Human-readable name for this strategy.

        Following the pattern in providers.py, this is a static method
        rather than a property.
        """
        ...

    @abstractmethod
    async def initialize(self) -> None:
        """One-time initialization.

        Create tables, load indexes, load snapshots, etc. This is called
        once when the agent starts up.
        """
        ...

    @abstractmethod
    def write(self, target: str, content: str, **metadata: Any) -> bool:
        """Store a memory entry.

        Args:
            target: Either "memory" or "user"
            content: The entry text to store
            **metadata: Optional metadata (type, source, etc.)

        Returns:
            True if successful, False otherwise
        """
        ...

    @abstractmethod
    def search(self, query: str, limit: int = 5) -> list[MemoryEntry]:
        """Search for relevant memories.

        Args:
            query: Search query text
            limit: Maximum number of results to return

        Returns:
            List of MemoryEntry objects, sorted by relevance (score descending)
        """
        ...

    @abstractmethod
    def replace(self, target: str, old_content: str, new_content: str) -> bool:
        """Replace an existing entry.

        Args:
            target: Either "memory" or "user"
            old_content: Exact text of existing entry to match
            new_content: New entry text to replace with

        Returns:
            True if found and replaced, False otherwise
        """
        ...

    @abstractmethod
    def remove(self, target: str, content: str) -> bool:
        """Remove an entry.

        Args:
            target: Either "memory" or "user"
            content: Exact text of entry to remove

        Returns:
            True if found and removed, False otherwise
        """
        ...

    @abstractmethod
    def context(self, task: str, max_chars: int = 1500) -> str:
        """Format relevant context for system prompt injection.

        Args:
            task: The current task/query to find relevant context for
            max_chars: Maximum characters to return

        Returns:
            Formatted context string ready for system prompt injection
        """
        ...

    # Optional hooks (default: no-op)

    async def review(self, conversation: list[dict[str, str]]) -> list[dict[str, Any]]:
        """LLM-driven memory consolidation and review.

        Called periodically (e.g., every N turns) to review conversation
        and suggest memory changes. Strategies can implement this to
        add intelligent consolidation.

        Args:
            conversation: Recent conversation history

        Returns:
            List of changes applied (each with action, target, content, etc.)
        """
        return []

    async def on_turn_start(self) -> None:
        """Called at start of each agent turn.

        Strategies can use this for turn tracking, periodic operations, etc.
        """
        pass

    async def on_session_end(self) -> None:
        """Cleanup hook at session end.

        Strategies can use this for cleanup, persistence, etc.
        """
        pass

    async def on_pre_compress(self) -> None:
        """Called before context compression.

        Strategies can use this to prepare for compression or update
        cached state.
        """
        pass

    def should_review(self, turn_count: int) -> bool:
        """Check if review should run this turn.

        Args:
            turn_count: Current turn number

        Returns:
            True if review should run, False otherwise
        """
        return False

    def get_tool_schema(self) -> Optional[dict[str, Any]]:
        """OpenAI tool schema for LLM interaction.

        Returns None if this strategy doesn't need a tool (e.g., read-only).
        Otherwise returns a dict with OpenAI function calling schema.

        Returns:
            Tool schema dict or None
        """
        return None

    def get_tool_schemas(self) -> list[dict[str, Any]]:
        """Multiple tool schemas (for strategies that expose multiple tools).

        Default implementation calls get_tool_schema().

        Returns:
            List of tool schema dicts
        """
        schema = self.get_tool_schema()
        return [schema] if schema else []

    async def handle_tool_call(self, tool_name: str, arguments: dict[str, Any]) -> str:
        """Handle a tool call from the LLM.

        Args:
            tool_name: Name of the tool being called
            arguments: Tool arguments from LLM

        Returns:
            Result message to return to LLM
        """
        return f"Tool {tool_name} not implemented by this strategy."

    @property
    def version(self) -> str:
        """Version identifier for this strategy."""
        return "1.0.0"
