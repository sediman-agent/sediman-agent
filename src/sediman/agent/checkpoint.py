"""Pre-edit checkpointing via OpenSandbox filesystem operations.

Auto-snapshots directories before dangerous tool calls (write_file, patch,
terminal) so users can /rewind if something goes wrong. Uses tar archives
stored locally since the sandbox is a remote container.
"""
from __future__ import annotations

import io
import os
import shutil
import tarfile
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import structlog

from sediman.config import DATA_DIR

logger = structlog.get_logger()

_DANGEROUS_TOOLS = {"write_file", "patch", "terminal"}
_CHECKPOINTS_DIR = DATA_DIR / "checkpoints"


@dataclass
class CheckpointInfo:
    id: str
    name: str
    target_dir: str
    created_at: str


class CheckpointManager:
    """Manages pre-edit filesystem checkpoints.

    For local files (write_file, patch), snapshots the parent directory
    as a tar archive on the host. For terminal commands operating inside
    the OpenSandbox container, snapshots are taken via ``tar`` inside the
    container and the archive is pulled to the host.
    """

    def __init__(self, enabled: bool = True) -> None:
        self.enabled = enabled
        self._last_checkpoint: CheckpointInfo | None = None
        _CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)

    async def maybe_checkpoint(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        cwd: str | None = None,
        sandbox_runner: Any | None = None,
    ) -> CheckpointInfo | None:
        if not self.enabled or tool_name not in _DANGEROUS_TOOLS:
            return None

        target_dir = self._resolve_target_dir(tool_name, arguments, cwd)
        if not target_dir or not Path(target_dir).exists():
            if sandbox_runner and sandbox_runner.available:
                return await self._checkpoint_in_sandbox(
                    sandbox_runner, target_dir or cwd or "/", tool_name,
                )
            return None

        try:
            cp_id = uuid.uuid4().hex[:12]
            name = f"pre-{tool_name}"
            tar_path = _CHECKPOINTS_DIR / f"{cp_id}.tar.gz"

            tar_data = await asyncio.to_thread(
                _create_tar, target_dir,
            )
            tar_path.write_bytes(tar_data)

            info = CheckpointInfo(
                id=cp_id,
                name=name,
                target_dir=target_dir,
                created_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
            )
            self._last_checkpoint = info
            logger.info("checkpoint_created", id=cp_id, tool=tool_name, dir=target_dir)
            return info
        except Exception as e:
            logger.debug("checkpoint_exception", error=str(e))
        return None

    async def _checkpoint_in_sandbox(
        self,
        sandbox_runner: Any,
        target_dir: str,
        tool_name: str,
    ) -> CheckpointInfo | None:
        try:
            sb = await sandbox_runner.get_sandbox()
            if sb is None:
                return None

            cp_id = uuid.uuid4().hex[:12]
            name = f"pre-{tool_name}"
            archive_path = f"/tmp/_sediman_cp_{cp_id}.tar.gz"

            await sb.commands.run(
                f"tar czf {archive_path} -C {target_dir} . 2>/dev/null || true"
            )
            content = await sb.files.read_file(archive_path)

            tar_path = _CHECKPOINTS_DIR / f"{cp_id}.tar.gz"
            meta_path = _CHECKPOINTS_DIR / f"{cp_id}.meta"

            if isinstance(content, bytes):
                tar_path.write_bytes(content)
            else:
                tar_path.write_bytes(content.encode())

            meta_path.write_text(f"{target_dir}\n")

            info = CheckpointInfo(
                id=cp_id,
                name=name,
                target_dir=target_dir,
                created_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
            )
            self._last_checkpoint = info
            logger.info("checkpoint_created_sandbox", id=cp_id, tool=tool_name)
            return info
        except Exception as e:
            logger.debug("checkpoint_sandbox_exception", error=str(e))
        return None

    async def revert(self, checkpoint_id: str, target_dir: str) -> bool:
        tar_path = _CHECKPOINTS_DIR / f"{checkpoint_id}.tar.gz"
        if not tar_path.exists():
            logger.warning("checkpoint_not_found", id=checkpoint_id)
            return False

        try:
            await asyncio.to_thread(
                _extract_tar, str(tar_path), target_dir,
            )
            logger.info("checkpoint_reverted", id=checkpoint_id, dir=target_dir)
            return True
        except Exception as e:
            logger.debug("checkpoint_revert_exception", error=str(e))
            return False

    async def list_checkpoints(self, target_dir: str | None = None) -> list[CheckpointInfo]:
        results: list[CheckpointInfo] = []
        for meta_path in _CHECKPOINTS_DIR.glob("*.meta"):
            cp_id = meta_path.stem
            lines = meta_path.read_text().strip().splitlines()
            cp_dir = lines[0] if lines else "unknown"
            if target_dir and cp_dir != target_dir:
                continue
            tar_path = _CHECKPOINTS_DIR / f"{cp_id}.tar.gz"
            if not tar_path.exists():
                continue
            results.append(CheckpointInfo(
                id=cp_id,
                name="pre-edit",
                target_dir=cp_dir,
                created_at=time.strftime(
                    "%Y-%m-%dT%H:%M:%S",
                    time.localtime(tar_path.stat().st_mtime),
                ),
            ))
        return results

    async def delete_checkpoint(self, checkpoint_id: str) -> bool:
        removed = False
        for ext in (".tar.gz", ".meta"):
            p = _CHECKPOINTS_DIR / f"{checkpoint_id}{ext}"
            if p.exists():
                p.unlink()
                removed = True
        return removed

    def _resolve_target_dir(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        cwd: str | None,
    ) -> str | None:
        if tool_name in ("write_file", "patch"):
            path = arguments.get("path")
            if path:
                p = Path(path).expanduser().resolve()
                return str(p.parent)
        if tool_name == "terminal":
            return cwd or "."
        return cwd or "."

    def get_last(self) -> CheckpointInfo | None:
        return self._last_checkpoint


import asyncio


def _create_tar(directory: str) -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        tar.add(directory, arcname=".", recursive=True)
    return buf.getvalue()


def _extract_tar(tar_path: str, target_dir: str) -> None:
    with tarfile.open(tar_path, "r:gz") as tar:
        tar.extractall(path=target_dir, filter="data")
