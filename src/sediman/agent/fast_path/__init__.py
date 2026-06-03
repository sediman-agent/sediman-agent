"""Fast path handlers for common task patterns.

This module contains handlers for common task patterns that can
be executed more efficiently without full planning overhead.
"""

from __future__ import annotations

from sediman.agent.fast_path.turbo_handler import TurboHandler
from sediman.agent.fast_path.url_handler import UrlHandler
from sediman.agent.fast_path.schedule_handler import ScheduleHandler

__all__ = [
    "TurboHandler",
    "UrlHandler",
    "ScheduleHandler",
]
