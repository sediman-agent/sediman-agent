"""Turbo mode handler for fast browser task execution."""

from __future__ import annotations

import asyncio

import structlog

from sediman.agent.browser_agent import BrowserResult
from sediman.agent.state import AgentState, Strategy
from sediman.agent.types import AgentResult, StepEvent
from sediman.browser.session import BrowserSession
from sediman.llm.provider import LLMProvider

logger = structlog.get_logger()


class TurboHandler:
    """Handles turbo mode execution for simple browser tasks.

    Turbo mode skips LLM planning and goes directly to browser
    execution for eligible tasks.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        browser_session: BrowserSession,
        on_step=None,
        max_steps: int = 25,
        flash_mode: bool = True,
    ):
        self.llm = llm_provider
        self.browser = browser_session
        self.on_step = on_step
        self.max_steps = max_steps
        self.flash_mode = flash_mode

    def is_eligible(self, task: str, conversation: list[dict[str, str]]) -> bool:
        """Check if task is eligible for turbo mode.

        Tasks must:
        - Have no prior conversation
        - Be reasonably short (< 500 chars)
        - Not be scheduling/chat/ambiguous keywords
        - Contain action verbs
        """
        from sediman.agent.locales import (
            SCHEDULE_KEYWORDS,
            CHAT_KEYWORDS,
            AMBIGUOUS_KEYWORDS,
            ACTION_VERBS,
        )

        if conversation:
            return False
        if len(task) > 500:
            return False

        task_lower = task.lower()
        if any(kw in task_lower for kw in SCHEDULE_KEYWORDS):
            return False
        if any(kw in task_lower for kw in CHAT_KEYWORDS):
            return False
        if any(kw in task_lower for kw in AMBIGUOUS_KEYWORDS):
            return False
        if not any(kw in task_lower for kw in ACTION_VERBS):
            return False

        return True

    async def execute(
        self,
        task: str,
        state: AgentState,
        memory_context: str = "",
        on_streaming_text=None,
    ) -> AgentResult:
        """Execute task in turbo mode."""
        state.phase = AgentPhase.EXECUTING

        step = AgentState.PlanStep(id=0, description=task, strategy=Strategy.DIRECT)
        step.status = "in_progress"

        recording_name = self._get_active_recording_name()
        browser_agent = self._get_browser_agent(
            recording_name=recording_name,
            task=task,
            memory_context=memory_context,
        )

        browser_result: BrowserResult = await browser_agent.run(task=task)

        step.result = browser_result.text
        step.status = "completed"
        state.actions_taken.extend(browser_result.actions)
        state.result = browser_result.text

        return AgentResult(
            task=task,
            result=state.result,
            steps=[StepEvent(
                step=0,
                action=f"direct: {task[:80]}",
                observation=browser_result.text[:200],
            )],
            actions_taken=state.actions_taken,
            iterations=1,
            strategy_used="direct",
        )

    def _get_browser_agent(
        self,
        recording_name: str | None = None,
        task: str = "",
        memory_context: str = "",
    ):
        """Get or create browser agent for turbo execution."""
        from sediman.agentbrowser.session import AgentBrowserSession

        if isinstance(self.browser, AgentBrowserSession):
            from sediman.agentbrowser.subagent import AgentBrowserSubagent
            return AgentBrowserSubagent(
                browser_session=self.browser,
                llm_provider=self.llm,
                max_steps=self.max_steps,
                on_browser_step=None,
                conversation=[],
                memory_context=memory_context,
                recording_name=recording_name,
            )

        from sediman.agent.browser_agent import BrowserSubagent
        return BrowserSubagent(
            browser_session=self.browser,
            llm_provider=self.llm,
            max_steps=self.max_steps,
            flash_mode=self.flash_mode,
            turbo_mode=True,
            on_browser_step=None,
            conversation=[],
            recording_name=recording_name,
            memory_context=memory_context,
        )

    def _get_active_recording_name(self) -> str | None:
        """Get active recording name if any."""
        try:
            from sediman.agent.recording_manager import RecordingManager
            mgr = RecordingManager.get_instance()
            if mgr.is_recording():
                recorder = mgr.get_active_recorder()
                if recorder and recorder.session:
                    return recorder.session.name
        except Exception:
            logger.debug("recording_status_check_failed")
        return None
