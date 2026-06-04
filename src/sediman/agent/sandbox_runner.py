"""Sandbox runner — executes commands inside OpenSandbox containers.

Provides Docker-based isolation via the OpenSandbox SDK. Every terminal
command MUST go through SandboxRunner. Falls back to raw subprocess when
Docker / OpenSandbox server is unavailable.
"""
from __future__ import annotations

import asyncio
import os
import uuid
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

import structlog

from sediman.config import (
    DATA_DIR,
    OPENSANDBOX_API_KEY,
    OPENSANDBOX_CPU,
    OPENSANDBOX_DOMAIN,
    OPENSANDBOX_ENABLED,
    OPENSANDBOX_IMAGE,
    OPENSANDBOX_MEMORY,
    OPENSANDBOX_TIMEOUT_SECS,
)

logger = structlog.get_logger()


@dataclass
class SandboxResult:
    success: bool
    output: str
    exit_code: int
    timed_out: bool = False
    sandboxed: bool = True


def _build_connection_config() -> Any:
    from opensandbox.config import ConnectionConfig

    protocol = "http"
    domain = OPENSANDBOX_DOMAIN
    if domain.startswith("https://"):
        protocol = "https"
        domain = domain.removeprefix("https://")
    elif domain.startswith("http://"):
        domain = domain.removeprefix("http://")

    return ConnectionConfig(
        domain=domain,
        api_key=OPENSANDBOX_API_KEY or None,
        protocol=protocol,
        request_timeout=timedelta(seconds=120),
    )


class SandboxRunner:
    """Runs shell commands inside an OpenSandbox container.

    Creates a single long-lived sandbox on first use and reuses it for
    subsequent commands. The sandbox is killed on ``close()`` or when
    the process exits.

    If OpenSandbox is unavailable (no Docker, server not running), falls
    back to raw subprocess execution with ``sandboxed=False``.
    """

    def __init__(self) -> None:
        self._sandbox: Any | None = None
        self._sandbox_id: str | None = None
        self._available: bool | None = None
        self._config = _build_connection_config() if OPENSANDBOX_ENABLED else None
        self._lock = asyncio.Lock()

    async def _ensure_sandbox(self) -> Any:
        if self._sandbox is not None:
            return self._sandbox

        if not OPENSANDBOX_ENABLED or self._config is None:
            self._available = False
            return None

        if self._available is False:
            return None

        try:
            from opensandbox.sandbox import Sandbox

            resource = {"cpu": OPENSANDBOX_CPU, "memory": OPENSANDBOX_MEMORY}
            sb = await Sandbox.create(
                OPENSANDBOX_IMAGE,
                connection_config=self._config,
                timeout=timedelta(seconds=OPENSANDBOX_TIMEOUT_SECS),
                resource=resource,
                env={"DEBIAN_FRONTEND": "noninteractive"},
            )
            self._sandbox = sb
            self._sandbox_id = sb.id
            self._available = True
            logger.info(
                "opensandbox_created",
                sandbox_id=sb.id,
                image=OPENSANDBOX_IMAGE,
            )
            return sb
        except Exception as e:
            self._available = False
            logger.warning(
                "opensandbox_unavailable",
                error=str(e),
                message="Falling back to raw subprocess. Install Docker and start opensandbox-server.",
            )
            return None

    async def run(
        self,
        command: str,
        cwd: str | None = None,
        timeout: int = 30,
        allow_net: bool = False,
        **_kwargs: Any,
    ) -> SandboxResult:
        sb = await self._ensure_sandbox()

        if sb is None:
            return await self._run_fallback(command, cwd, timeout)

        full_cmd = command
        if cwd:
            full_cmd = f"cd {cwd} 2>/dev/null; {command}"

        try:
            execution = await asyncio.wait_for(
                sb.commands.run(full_cmd),
                timeout=timeout + 10,
            )

            parts: list[str] = []
            for log in execution.logs.stdout:
                parts.append(log.text)
            for log in execution.logs.stderr:
                parts.append(log.text)
            output = "\n".join(parts) if parts else ""

            exit_code = execution.exit_code if hasattr(execution, "exit_code") else 0
            if exit_code is None:
                exit_code = 0

            return SandboxResult(
                success=exit_code == 0,
                output=output,
                exit_code=exit_code,
                sandboxed=True,
            )
        except asyncio.TimeoutError:
            return SandboxResult(
                success=False,
                output=f"Sandbox timed out after {timeout}s",
                exit_code=124,
                timed_out=True,
                sandboxed=True,
            )
        except Exception as e:
            logger.warning("opensandbox_run_failed", command=command[:80], error=str(e))
            self._sandbox = None
            self._available = None
            return SandboxResult(
                success=False,
                output=f"Sandbox error: {e}",
                exit_code=1,
                sandboxed=True,
            )

    async def _run_fallback(
        self,
        command: str,
        cwd: str | None = None,
        timeout: int = 30,
    ) -> SandboxResult:
        logger.warning(
            "sandbox_fallback_raw_subprocess",
            command=command[:80],
            message="Running without sandbox isolation!",
        )
        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd or None,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            parts: list[str] = []
            if stdout:
                parts.append(stdout.decode(errors="replace"))
            if stderr:
                parts.append(stderr.decode(errors="replace"))
            output = "\n".join(parts) if parts else "(no output)"
            if proc.returncode != 0:
                output += f"\n[exit code: {proc.returncode}]"
            if len(output) > 10000:
                output = output[:10000] + "\n... (output truncated)"
            return SandboxResult(
                success=proc.returncode == 0,
                output=output,
                exit_code=proc.returncode or 0,
                sandboxed=False,
            )
        except asyncio.TimeoutError:
            return SandboxResult(
                success=False,
                output=f"Command timed out after {timeout}s",
                exit_code=124,
                timed_out=True,
                sandboxed=False,
            )
        except (OSError, asyncio.CancelledError) as e:
            logger.error("terminal_execution_error", command=command[:80], error=str(e))
            return SandboxResult(
                success=False,
                output=f"Command failed: {e}",
                exit_code=1,
                sandboxed=False,
            )

    async def get_sandbox(self) -> Any | None:
        return await self._ensure_sandbox()

    async def close(self) -> None:
        if self._sandbox is not None:
            try:
                await self._sandbox.kill()
                await self._sandbox.close()
                logger.info("opensandbox_killed", sandbox_id=self._sandbox_id)
            except Exception as e:
                logger.debug("opensandbox_close_error", error=str(e))
            finally:
                self._sandbox = None
                self._sandbox_id = None

    @property
    def available(self) -> bool:
        return self._available is True

    @property
    def sandbox_id(self) -> str | None:
        return self._sandbox_id
