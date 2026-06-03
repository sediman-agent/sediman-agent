"""FileMemoryStrategy — current default behavior wrapped in new interface.

This strategy wraps the existing MemoryStore (MEMORY.md/USER.md files) and
VectorStore (SQLite vectors) behind the BaseMemoryStrategy interface.
It maintains 100% backward compatibility with the current implementation.
"""

from __future__ import annotations

from typing import Any, Optional

import structlog

from sediman.memory.strategy import BaseMemoryStrategy, MemoryEntry, MemoryTarget, MemoryType
from sediman.memory.storage.store import MemoryStore
from sediman.memory.vector.vector_store import VectorStore
from sediman.memory.core.entry import ensure_meta_for_entry, record_access_by_content
from sediman.memory.core.providers import MEMORY_TOOL_SCHEMA

logger = structlog.get_logger()


class FileMemoryStrategy(BaseMemoryStrategy):
    """Default file-based memory strategy.

    Wraps the existing MemoryStore (MEMORY.md/USER.md files) and
    VectorStore (SQLite vectors) behind the BaseMemoryStrategy interface.

    This maintains 100% backward compatibility — all existing behavior
    is preserved, just wrapped behind the new interface.
    """

    def __init__(self, data_dir: Optional[str] = None, review_interval: int = 10):
        """Initialize the file memory strategy.

        Args:
            data_dir: Optional custom data directory (defaults to config.DATA_DIR)
            review_interval: Number of turns between background reviews
        """
        from sediman.config import DATA_DIR
        self._data_dir = data_dir or DATA_DIR
        self._store = MemoryStore()
        self._vector_store = VectorStore()
        self._review_interval = review_interval
        self._turn_count = 0
        self._initialized = False
        self._llm = None

    @staticmethod
    def name() -> str:
        """Human-readable name for this strategy."""
        return "FileMemoryStrategy"

    async def initialize(self) -> None:
        """One-time initialization — load snapshot and vector index."""
        if self._initialized:
            return
        self._store.load_snapshot()
        self._vector_store._ensure_loaded()
        self._initialized = True

    def write(self, target: str, content: str, **metadata: Any) -> bool:
        """Store a memory entry.

        Delegates to MemoryStore.add_or_consolidate() and updates vector index.

        Args:
            target: Either "memory" or "user"
            content: The entry text to store
            **metadata: Optional metadata (type, source, etc.)

        Returns:
            True if successful, False otherwise
        """
        result = self._store.add_or_consolidate(target, content)
        if result.success:
            self._store.refresh_snapshot()
            self._index_entry(content, target)
            return True
        return False

    def search(self, query: str, limit: int = 5) -> list[MemoryEntry]:
        """Search for relevant memories.

        Delegates to VectorStore.search() with fallback to text search.

        Args:
            query: Search query text
            limit: Maximum number of results to return

        Returns:
            List of MemoryEntry objects, sorted by relevance
        """
        try:
            results = self._vector_store.search(query, k=limit, threshold=0.2)
            entries = []
            for r in results:
                text = r.get("text", "")
                score = r.get("score", 0.0)
                meta = r.get("metadata", {})
                entries.append(MemoryEntry(
                    content=text,
                    target=MemoryTarget(meta.get("target", "memory")),
                    score=score,
                ))
                self._store.record_access(text)
            return entries
        except Exception as e:
            logger.debug("vector_search_failed", error=str(e))
            # Fallback to text search
            all_entries = self._store.get_all_entries()
            query_lower = query.lower()
            scored = []
            for tgt, entries_list in all_entries.items():
                for entry in entries_list:
                    if query_lower in entry.lower():
                        scored.append((1.0, entry, MemoryTarget(tgt)))
            scored.sort(key=lambda x: -x[0])
            return [
                MemoryEntry(content=e, target=t, score=s)
                for s, e, t in scored[:limit]
            ]

    def replace(self, target: str, old_content: str, new_content: str) -> bool:
        """Replace an existing entry.

        Delegates to MemoryStore.replace() and updates vector index.

        Args:
            target: Either "memory" or "user"
            old_content: Exact text of existing entry to match
            new_content: New entry text to replace with

        Returns:
            True if found and replaced, False otherwise
        """
        result = self._store.replace(target, old_content, new_content)
        if result.success:
            self._store.refresh_snapshot()
            self._unindex_entry(old_content)
            self._index_entry(new_content, target)
            return True
        return False

    def remove(self, target: str, content: str) -> bool:
        """Remove an entry.

        Delegates to MemoryStore.remove() and updates vector index.

        Args:
            target: Either "memory" or "user"
            content: Exact text of entry to remove

        Returns:
            True if found and removed, False otherwise
        """
        result = self._store.remove(target, content)
        if result.success:
            self._store.refresh_snapshot()
            self._unindex_entry(content)
            return True
        return False

    def context(self, task: str, max_chars: int = 1500) -> str:
        """Format relevant context for system prompt injection.

        Delegates to MemoryStore.format_for_system_prompt_filtered().

        Args:
            task: The current task/query to find relevant context for
            max_chars: Maximum characters to return

        Returns:
            Formatted context string ready for system prompt injection
        """
        if not self._initialized:
            self._store.load_snapshot()
        return self._store.format_for_system_prompt_filtered(task, max_chars=max_chars)

    async def review(self, conversation: list[dict[str, str]]) -> list[dict[str, Any]]:
        """LLM-driven consolidation and review.

        This implements the existing MemoryManager review logic.

        Args:
            conversation: Recent conversation history

        Returns:
            List of changes applied
        """
        if not self._llm:
            return []

        # Import here to avoid circular dependency
        from sediman.memory.manager import MemoryManager

        # Create temporary manager with our store and vector store
        temp_mgr = MemoryManager(self._llm, self._review_interval)
        temp_mgr._store = self._store
        temp_mgr._get_vector_store = lambda: self._vector_store

        # Run the review (changes applied via store methods)
        await temp_mgr.run_background_review(conversation)

        # Return empty list since changes are applied directly via store
        return []

    async def on_turn_start(self) -> None:
        """Called at start of each agent turn.

        Increments turn counter for review scheduling.
        """
        self._turn_count += 1

    def should_review(self, turn_count: int) -> bool:
        """Check if review should run this turn.

        Args:
            turn_count: Current turn number (ignored, uses internal counter)

        Returns:
            True if review should run this turn
        """
        return self._turn_count > 0 and self._turn_count % self._review_interval == 0

    def get_tool_schema(self) -> Optional[dict[str, Any]]:
        """Return the memory tool schema.

        Returns the existing MEMORY_TOOL_SCHEMA from providers.py.

        Returns:
            Tool schema dict for OpenAI function calling
        """
        return {
            "type": "function",
            "function": {
                "name": MEMORY_TOOL_SCHEMA.name,
                "description": MEMORY_TOOL_SCHEMA.description,
                "parameters": MEMORY_TOOL_SCHEMA.parameters,
            },
        }

    async def handle_tool_call(self, tool_name: str, arguments: dict[str, Any]) -> str:
        """Handle the memory tool call from the LLM.

        Routes to appropriate store methods based on action.

        Args:
            tool_name: Name of the tool being called (should be "memory")
            arguments: Tool arguments from LLM

        Returns:
            Result message to return to LLM
        """
        if tool_name != "memory":
            return f"Unknown tool: {tool_name}"

        action = arguments.get("action", "")
        target = arguments.get("target", "memory")
        content = arguments.get("content", "")
        old_entry = arguments.get("old_entry", "")

        if action == "add":
            if self.write(target, content):
                usage = self._store.get_usage(target)
                return f"Added to {target}. Usage: {usage.formatted}, {len(usage.entries)} entries"
            return f"Failed to add to {target}"
        elif action == "replace":
            if self.replace(target, old_entry, content):
                return f"Replaced in {target}"
            return f"Failed to replace in {target}"
        elif action == "remove":
            if self.remove(target, old_entry):
                return f"Removed from {target}"
            return f"Failed to remove from {target}"

        return f"Unknown action: {action}"

    def _index_entry(self, content: str, target: str) -> None:
        """Index entry in vector store.

        Args:
            content: Entry text to index
            target: Target store ("memory" or "user")
        """
        try:
            self._vector_store.add(content, metadata={"target": target, "source": "memory"})
        except Exception as e:
            logger.debug("memory_index_failed", error=str(e))

    def _unindex_entry(self, content: str) -> None:
        """Remove entry from vector store.

        Args:
            content: Entry text to remove from index
        """
        try:
            self._vector_store.remove(content)
        except Exception as e:
            logger.debug("memory_unindex_failed", error=str(e))

    def set_llm(self, llm) -> None:
        """Set LLM provider for review.

        Args:
            llm: LLM provider instance
        """
        self._llm = llm

    def get_snapshot(self) -> str:
        """Get the current memory snapshot.

        Returns:
            Current snapshot text
        """
        return self._store.snapshot or ""

    def get_system_prompt_block(self) -> str:
        """Get system prompt block with memory context.

        Returns:
            Formatted memory context for system prompt
        """
        if not self._initialized:
            self._store.load_snapshot()
        return self._store.format_for_system_prompt()
