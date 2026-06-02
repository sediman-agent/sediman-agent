from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import structlog

logger = structlog.get_logger()

WORKTREE_DIR = ".terminator-worktrees"
STASH_MESSAGE = "sediman-terminator-preflight"


def find_git_root(start=None):
    start = Path(start or Path.cwd()).resolve()
    current = start
    for _ in range(32):
        if (current / ".git").exists():
            return current
        parent = current.parent
        if parent == current:
            return None
        current = parent
    return None


def create_worktree(repo_root, branch, base="HEAD"):
    worktrees_dir = repo_root / WORKTREE_DIR
    worktrees_dir.mkdir(parents=True, exist_ok=True)
    worktree_path = worktrees_dir / branch
    if worktree_path.exists():
        shutil.rmtree(worktree_path, ignore_errors=True)

    result = subprocess.run(
        ["git", "-C", str(repo_root), "worktree", "add", str(worktree_path), base],
        capture_output=True, text=True, timeout=30)

    if result.returncode != 0:
        stderr = result.stderr.strip()
        if "already exists" in stderr.lower() or "already checked out" in stderr.lower():
            subprocess.run(
                ["git", "-C", str(repo_root), "worktree", "remove", str(worktree_path), "--force"],
                capture_output=True, text=True, timeout=15)
            shutil.rmtree(worktree_path, ignore_errors=True)
            result = subprocess.run(
                ["git", "-C", str(repo_root), "worktree", "add", str(worktree_path), base],
                capture_output=True, text=True, timeout=30)

    if result.returncode != 0:
        raise RuntimeError(f"Failed to create worktree: {result.stderr.strip()[:200]}")

    if branch != base:
        subprocess.run(
            ["git", "-C", str(worktree_path), "checkout", "-b", branch],
            capture_output=True, text=True, timeout=15)

    logger.info("worktree_created", branch=branch, path=str(worktree_path))
    return worktree_path


def remove_worktree(worktree_path):
    if not worktree_path.exists():
        return False
    repo_root = find_git_root(worktree_path)
    if repo_root is None:
        return False
    result = subprocess.run(
        ["git", "-C", str(repo_root), "worktree", "remove", str(worktree_path), "--force"],
        capture_output=True, text=True, timeout=15)
    if not worktree_path.exists():
        logger.info("worktree_removed", path=str(worktree_path))
        return True
    if result.returncode == 0:
        shutil.rmtree(worktree_path, ignore_errors=True)
        logger.info("worktree_removed", path=str(worktree_path))
        return True
    return False


def cleanup_worktrees(repo_root):
    worktrees_dir = repo_root / WORKTREE_DIR
    if not worktrees_dir.exists():
        return 0
    count = 0
    for child in sorted(worktrees_dir.iterdir()):
        if child.is_dir():
            if remove_worktree(child):
                count += 1
    shutil.rmtree(worktrees_dir, ignore_errors=True)
    return count


def stash_push(repo_root):
    result = subprocess.run(
        ["git", "-C", str(repo_root), "stash", "push", "--include-untracked", "-m", STASH_MESSAGE],
        capture_output=True, text=True, timeout=15)
    if result.returncode != 0:
        return False
    output = result.stdout.strip()
    return "No local changes to save" not in output and "Saved working directory" in output


def stash_pop(repo_root):
    stash_list = subprocess.run(
        ["git", "-C", str(repo_root), "stash", "list"],
        capture_output=True, text=True, timeout=10)
    if STASH_MESSAGE not in stash_list.stdout:
        return False
    lines = stash_list.stdout.strip().split("\n")
    target_index = 0
    for i, line in enumerate(lines):
        if STASH_MESSAGE in line:
            target_index = i
            break
    result = subprocess.run(
        ["git", "-C", str(repo_root), "stash", "pop", f"stash@{{{target_index}}}"],
        capture_output=True, text=True, timeout=15)
    return result.returncode == 0
