"""Core memory components."""

from sediman.memory.core.entry import (
    MemoryEntryMeta,
    classify_entry_type,
    ensure_meta_for_entry,
    get_all_meta_for_target,
    get_meta_map_for_target,
    load_entry_meta,
    record_access_by_content,
    save_entry_meta,
)
from sediman.memory.core.consolidator import MemoryConsolidator
from sediman.memory.core.providers import BuiltinMemoryProvider, MemoryProvider, MEMORY_TOOL_SCHEMA

__all__ = [
    "MemoryEntryMeta",
    "classify_entry_type",
    "ensure_meta_for_entry",
    "get_all_meta_for_target",
    "get_meta_map_for_target",
    "load_entry_meta",
    "record_access_by_content",
    "save_entry_meta",
    "MemoryConsolidator",
    "BuiltinMemoryProvider",
    "MemoryProvider",
    "MEMORY_TOOL_SCHEMA",
]
