"""Memory system with BaseMemoryStrategy interface.

This module provides the new unified interface for all memory implementations.
The BaseMemoryStrategy ABC defines the contract that all strategies must follow.
"""

import sys as _sys
from importlib import import_module as _import_module

from sediman.memory.strategy import BaseMemoryStrategy, MemoryEntry, MemoryTarget, MemoryType
from sediman.memory.strategies.file_memory import FileMemoryStrategy

# Legacy exports for backward compatibility during migration
from sediman.memory.utils.changelog import MemoryChange, get_recent_changes, read_changelog
from sediman.memory.core.entry import (
    MemoryEntryMeta,
    MemoryType as OldMemoryType,
    classify_entry_type,
    ensure_meta_for_entry,
    get_all_meta_for_target,
    get_meta_map_for_target,
    load_entry_meta,
    record_access_by_content,
    save_entry_meta,
)
from sediman.memory.storage.store import MemoryStore
from sediman.memory.core.providers import BuiltinMemoryProvider, MemoryProvider
from sediman.memory.utils.security import scan_content

# Set up sys.modules redirects for moved modules to support old imports
_module_redirects = {
    "sediman.memory.store": "sediman.memory.storage.store",
    "sediman.memory.vector": "sediman.memory.vector.vector_store",
    "sediman.memory.entry": "sediman.memory.core.entry",
    "sediman.memory.consolidator": "sediman.memory.core.consolidator",
    "sediman.memory.providers": "sediman.memory.core.providers",
    "sediman.memory.sessions": "sediman.memory.storage.sessions",
    "sediman.memory.trajectories": "sediman.memory.storage.trajectories",
    "sediman.memory.embeddings": "sediman.memory.vector.embeddings",
    "sediman.memory.changelog": "sediman.memory.utils.changelog",
    "sediman.memory.security": "sediman.memory.utils.security",
    "sediman.memory.scrubber": "sediman.memory.utils.scrubber",
    "sediman.memory.importance": "sediman.memory.utils.importance",
    "sediman.memory.preferences": "sediman.memory.utils.preferences",
    "sediman.memory.tiers": "sediman.memory.utils.tiers",
    "sediman.memory.prompt": "sediman.memory.utils.prompt",
    "sediman.memory.auto_memory": "sediman.memory.utils.auto_memory",
}

# Register redirects in sys.modules so old imports still work
for old_path, new_path in _module_redirects.items():
    if old_path not in _sys.modules:
        try:
            _sys.modules[old_path] = _import_module(new_path)
        except (ImportError, AttributeError):
            pass

__all__ = [
    # New interface
    "BaseMemoryStrategy",
    "MemoryEntry",
    "MemoryTarget",
    "MemoryType",
    "FileMemoryStrategy",
    # Legacy exports (for backward compatibility)
    "MemoryStore",
    "MemoryProvider",
    "BuiltinMemoryProvider",
    "scan_content",
    "MemoryEntryMeta",
    "OldMemoryType",
    "MemoryChange",
    "classify_entry_type",
    "ensure_meta_for_entry",
    "record_access_by_content",
    "get_all_meta_for_target",
    "get_meta_map_for_target",
    "get_recent_changes",
    "read_changelog",
]
