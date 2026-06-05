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
from enum import Enum
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


class SandboxErrorType(Enum):
    """Types of sandbox errors for better error handling."""
    CREATION_FAILED = "creation_failed"
    EXECUTION_FAILED = "execution_failed"
    TIMEOUT = "timeout"
    NETWORK_ERROR = "network_error"
    RESOURCE_ERROR = "resource_error"
    UNKNOWN = "unknown"


@dataclass
class SandboxResult:
    success: bool
    output: str
    exit_code: int
    timed_out: bool = False
    sandboxed: bool = True
    error_type: SandboxErrorType | None = None
    error_message: str | None = None
    retryable: bool = False


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

        async with self._lock:
            if self._sandbox is not None:
                return self._sandbox
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
            except ConnectionRefusedError as e:
                self._available = False
                logger.warning(
                    "opensandbox_connection_refused",
                    error=str(e),
                    message="OpenSandbox server not running. Falling back to raw subprocess.",
                )
                return None
            except TimeoutError as e:
                self._available = False
                logger.warning(
                    "opensandbox_creation_timeout",
                    error=str(e),
                    message="Sandbox creation timed out. Falling back to raw subprocess.",
                )
                return None
            except ImportError as e:
                self._available = False
                logger.warning(
                    "opensandbox_import_failed",
                    error=str(e),
                    message="OpenSandbox SDK not installed. Falling back to raw subprocess.",
                )
                return None
            except Exception as e:
                self._available = False
                logger.warning(
                    "opensandbox_unavailable",
                    error=str(e),
                    error_type=type(e).__name__,
                    message="Falling back to raw subprocess. Install Docker and start opensandbox-server.",
                )
                return None

    def _build_net_prefix(self, allow_net: bool) -> str:
        if allow_net:
            return ""
        return "unshare --net --map-root-user 2>/dev/null; "

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
        if not allow_net:
            full_cmd = self._build_net_prefix(allow_net) + full_cmd

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
                output=f"Sandbox command timed out after {timeout}s. Consider increasing timeout or breaking into smaller steps.",
                exit_code=124,
                timed_out=True,
                sandboxed=True,
                error_type=SandboxErrorType.TIMEOUT,
                error_message="Command execution exceeded timeout limit",
                retryable=True,
            )
        except ConnectionRefusedError as e:
            logger.warning("opensandbox_connection_lost", command=command[:80], error=str(e))
            self._reset_sandbox()
            return SandboxResult(
                success=False,
                output=f"Sandbox connection lost: {e}. Retrying may work if connection is reestablished.",
                exit_code=1,
                sandboxed=True,
                error_type=SandboxErrorType.NETWORK_ERROR,
                error_message="Connection to sandbox server lost",
                retryable=True,
            )
        except OSError as e:
            logger.warning("opensandbox_resource_error", command=command[:80], error=str(e))
            self._reset_sandbox()
            return SandboxResult(
                success=False,
                output=f"Sandbox resource error: {e}. This may indicate insufficient resources or permissions.",
                exit_code=1,
                sandboxed=True,
                error_type=SandboxErrorType.RESOURCE_ERROR,
                error_message="Resource or permission error in sandbox",
                retryable=False,
            )
        except Exception as e:
            error_type_str = type(e).__name__
            logger.warning(
                "opensandbox_run_failed",
                command=command[:80],
                error=str(e),
                error_type=error_type_str,
            )

            transient = (
                "timeout" in str(e).lower()
                or "connection" in str(e).lower()
            )
            if transient:
                self._reset_sandbox()

            error_type = SandboxErrorType.UNKNOWN
            if "timeout" in str(e).lower():
                error_type = SandboxErrorType.TIMEOUT
            elif "connection" in str(e).lower():
                error_type = SandboxErrorType.NETWORK_ERROR
            elif "resource" in str(e).lower() or "memory" in str(e).lower():
                error_type = SandboxErrorType.RESOURCE_ERROR

            return SandboxResult(
                success=False,
                output=f"Sandbox execution failed: {e}. {'The sandbox state has been reset, ' if transient else ''}retry may work.",
                exit_code=1,
                sandboxed=True,
                error_type=error_type,
                error_message=str(e),
                retryable=True,
            )

    def _reset_sandbox(self) -> None:
        self._sandbox = None
        self._sandbox_id = None
        self._available = None

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
                output=f"Command timed out after {timeout}s. Consider increasing timeout or breaking into smaller steps.",
                exit_code=124,
                timed_out=True,
                sandboxed=False,
                error_type=SandboxErrorType.TIMEOUT,
                error_message="Command execution exceeded timeout limit",
                retryable=True,
            )
        except (OSError, asyncio.CancelledError) as e:
            error_type_str = type(e).__name__
            logger.error(
                "terminal_execution_error",
                command=command[:80],
                error=str(e),
                error_type=error_type_str,
            )

            error_type = SandboxErrorType.RESOURCE_ERROR
            error_message = str(e)
            retryable = False

            if isinstance(e, asyncio.CancelledError):
                error_type = SandboxErrorType.UNKNOWN
                error_message = "Command execution was cancelled"
                retryable = True
            elif "Permission denied" in error_message or "PermissionError" in error_message:
                error_type = SandboxErrorType.RESOURCE_ERROR
                error_message = f"Permission denied: {e}"
                retryable = False
            elif "No such file" in error_message or "FileNotFoundError" in error_message:
                error_type = SandboxErrorType.RESOURCE_ERROR
                error_message = f"Command or file not found: {e}"
                retryable = False
            elif "Too many open files" in error_message:
                error_type = SandboxErrorType.RESOURCE_ERROR
                error_message = f"System resource limit reached: {e}"
                retryable = False

            return SandboxResult(
                success=False,
                output=f"Command execution failed: {error_message}",
                exit_code=1,
                sandboxed=False,
                error_type=error_type,
                error_message=error_message,
                retryable=retryable,
            )
        except Exception as e:
            logger.error(
                "terminal_unexpected_error",
                command=command[:80],
                error=str(e),
                error_type=type(e).__name__,
            )
            return SandboxResult(
                success=False,
                output=f"Unexpected error during command execution: {e}",
                exit_code=1,
                sandboxed=False,
                error_type=SandboxErrorType.UNKNOWN,
                error_message=str(e),
                retryable=False,
            )

    async def get_sandbox(self) -> Any | None:
        return await self._ensure_sandbox()

    async def close(self) -> None:
        """Close the sandbox and clean up resources.

        Handles cleanup errors gracefully to ensure resources are always released.
        """
        if self._sandbox is not None:
            sandbox_id = self._sandbox_id
            try:
                await self._sandbox.kill()
                logger.info("opensandbox_killed", sandbox_id=sandbox_id)
            except ConnectionRefusedError as e:
                logger.warning(
                    "opensandbox_kill_connection_refused",
                    sandbox_id=sandbox_id,
                    error=str(e),
                )
            except TimeoutError as e:
                logger.warning(
                    "opensandbox_kill_timeout",
                    sandbox_id=sandbox_id,
                    error=str(e),
                )
            except Exception as e:
                logger.warning(
                    "opensandbox_kill_failed",
                    sandbox_id=sandbox_id,
                    error=str(e),
                    error_type=type(e).__name__,
                )
            finally:
                try:
                    await self._sandbox.close()
                except Exception as e:
                    logger.debug("opensandbox_close_error", error=str(e))
                self._sandbox = None
                self._sandbox_id = None

    @property
    def available(self) -> bool:
        return self._available is True

    @property
    def sandbox_id(self) -> str | None:
        return self._sandbox_id
