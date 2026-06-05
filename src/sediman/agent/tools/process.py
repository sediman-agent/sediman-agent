from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Any

import structlog

from sediman.agent.sandbox_runner import SandboxRunner
from sediman.agent.tool_dispatch import ToolResult

logger = structlog.get_logger()

_processes: dict[str, _ProcessEntry] = {}

_runner: SandboxRunner | None = None


def _get_runner() -> SandboxRunner:
    global _runner
    if _runner is None:
        _runner = SandboxRunner()
    return _runner


@dataclass
class _ProcessEntry:
    session_id: str
    process: asyncio.subprocess.Process | None
    command: str
    output: list[str] = field(default_factory=list)
    done: bool = False
    exit_code: int | None = None
    sandboxed: bool = False


async def _handle_process(action: str, session_id: str | None = None, data: str | None = None, **kwargs: Any) -> ToolResult:
    if action == "list":
        if not _processes:
            return ToolResult(success=True, output="No background processes.")
        lines = []
        for sid, entry in _processes.items():
            status = "done" if entry.done else "running"
            exit_info = f", exit={entry.exit_code}" if entry.exit_code is not None else ""
            sandbox_badge = " [sandbox]" if entry.sandboxed else ""
            lines.append(f"  {sid[:12]}  [{status}{exit_info}]{sandbox_badge}  {entry.command[:60]}")
        return ToolResult(success=True, output="\n".join(lines))

    if action == "poll":
        if not session_id or session_id not in _processes:
            return ToolResult(success=False, output=f"Process '{session_id}' not found.")
        entry = _processes[session_id]
        new_output = "".join(entry.output[-50:])
        entry.output.clear()
        status = "done" if entry.done else "running"
        return ToolResult(success=True, output=f"[{status}] {new_output}")

    if action == "log":
        if not session_id or session_id not in _processes:
            return ToolResult(success=False, output=f"Process '{session_id}' not found.")
        entry = _processes[session_id]
        full_output = "".join(entry.output[-500:])
        return ToolResult(success=True, output=full_output[:10000])

    if action == "kill":
        if not session_id or session_id not in _processes:
            return ToolResult(success=False, output=f"Process '{session_id}' not found.")
        entry = _processes[session_id]
        if not entry.done and entry.process is not None:
            entry.process.kill()
            entry.done = True
            entry.exit_code = -9
            del _processes[session_id]
            return ToolResult(success=True, output=f"Process {session_id[:12]} killed.")
        del _processes[session_id]
        return ToolResult(success=True, output=f"Process {session_id[:12]} was already done.")

    if action == "write":
        if not session_id or session_id not in _processes:
            return ToolResult(success=False, output=f"Process '{session_id}' not found.")
        entry = _processes[session_id]
        if entry.done:
            return ToolResult(success=False, output="Process has already exited.")
        if entry.process and entry.process.stdin:
            entry.process.stdin.write((data or "").encode())
            entry.process.stdin.write(b"\n")
            try:
                await entry.process.stdin.drain()
            except Exception:
                return ToolResult(success=False, output="Failed to write to process stdin (may have exited).")
        return ToolResult(success=True, output="Input sent.")

    return ToolResult(success=False, output=f"Unknown process action: {action}")


async def _handle_background_start(command: str, session_id: str | None = None, **kwargs: Any) -> ToolResult:
    sid = session_id or f"proc_{uuid.uuid4().hex[:12]}"

    runner = _get_runner()
    if runner.available:
        result = await runner.run(
            command=f"nohup {command} & echo $!",
            timeout=10,
            allow_net=False,
        )
        if result.success:
            entry = _ProcessEntry(
                session_id=sid,
                process=None,
                command=command,
                sandboxed=True,
            )
            _processes[sid] = entry
            return ToolResult(
                success=True,
                output=f"Background process started in sandbox: {sid}",
                data={"session_id": sid, "sandboxed": True},
            )
        logger.warning("sandbox_background_fallback", error=result.error_message)

    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            stdin=asyncio.subprocess.PIPE,
        )
        entry = _ProcessEntry(session_id=sid, process=proc, command=command)
        _processes[sid] = entry

        async def _reader():
            try:
                while True:
                    line = await proc.stdout.readline()
                    if not line:
                        break
                    entry.output.append(line.decode(errors="replace"))
            except Exception:
                pass
            finally:
                entry.done = True
                entry.exit_code = proc.returncode

        asyncio.ensure_future(_reader())

        return ToolResult(
            success=True,
            output=f"Background process started: {sid}",
            data={"session_id": sid, "pid": proc.pid},
        )
    except Exception as e:
        return ToolResult(success=False, output=f"Failed to start process: {e}")
