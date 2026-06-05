from __future__ import annotations

import asyncio
import sys
import tempfile
from pathlib import Path
from typing import Any

import structlog

from sediman.agent.sandbox_runner import SandboxRunner
from sediman.agent.tool_dispatch import ToolResult

logger = structlog.get_logger()

_runner: SandboxRunner | None = None


def _get_runner() -> SandboxRunner:
    global _runner
    if _runner is None:
        _runner = SandboxRunner()
    return _runner


async def _handle_execute_code(code: str, **kwargs: Any) -> ToolResult:
    runner = _get_runner()
    result = await runner.run(
        command=f"{sys.executable} -c {repr(code)}",
        timeout=60,
        allow_net=False,
    )

    output = result.output or ""
    if not result.sandboxed:
        logger.warning("execute_code_ran_without_sandbox", code_len=len(code))

    return ToolResult(
        success=result.success,
        output=output,
        data={
            "exit_code": result.exit_code,
            "sandboxed": result.sandboxed,
            "timed_out": result.timed_out,
        },
    )
