from __future__ import annotations

import asyncio
import uuid
from typing import Any

import structlog

logger = structlog.get_logger()


async def delegate_task(
    task: str,
    browser_session: Any,
    llm: Any,
    max_steps: int = 30,
) -> str:
    """Spawn an isolated subagent to run a task in parallel.

    The subagent gets its own browser context and LLM session.
    Only the final result is returned — no intermediate state leaks.

    ``browser_session`` must already be started — the caller is
    responsible for lifecycle management.
    """
    from sediman.browser.session import run_browser_task

    logger.info("subagent_delegated", task=task[:80])

    try:
        result_text, _actions = await run_browser_task(
            task=task,
            browser_session=browser_session,
            llm=llm,
            max_steps=max_steps,
        )
        return result_text
    except Exception as e:
        logger.error("subagent_failed", error=str(e))
        return f"Subagent failed: {e}"


async def delegate_parallel(
    tasks: list[str],
    browser_session: Any,
    llm_provider: Any,
    max_concurrent: int = 3,
) -> list[str]:
    """Run multiple tasks in parallel using subagents.

    Each task gets its own isolated ``BrowserSession`` so that
    concurrent browser operations never share state.  The shared
    ``browser_session`` argument is used **only** to derive
    configuration (headless mode, profile directory root).

    A semaphore caps the number of concurrently running browsers.
    Returns results in the same order as input tasks.
    """
    if not tasks:
        return []

    from sediman.browser.session import BrowserSession

    semaphore = asyncio.Semaphore(max_concurrent)
    results: list[str | None] = [None] * len(tasks)

    async def _run_with_semaphore(index: int, task: str) -> None:
        async with semaphore:
            worker_id = uuid.uuid4().hex[:8]
            session = BrowserSession(
                headless=browser_session.headless,
                user_data_dir=f"{browser_session.user_data_dir}-worker-{worker_id}",
            )
            try:
                await session.start()
                llm = llm_provider.get_browser_use_llm()
                results[index] = await delegate_task(task, session, llm)
            except Exception as e:
                logger.error("parallel_worker_failed", task=task[:80], error=str(e))
                results[index] = results[index] or f"Subagent failed: {e}"
            finally:
                await session.stop()

    coros = [_run_with_semaphore(i, t) for i, t in enumerate(tasks)]
    await asyncio.gather(*coros)

    logger.info("parallel_delegation_done", tasks=len(tasks))
    return [r or "No result" for r in results]
