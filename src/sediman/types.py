from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class BrowserResult:
    text: str
    actions: list[dict[str, Any]]
