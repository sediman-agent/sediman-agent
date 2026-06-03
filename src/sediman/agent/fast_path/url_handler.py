"""URL-only handler for direct navigation tasks."""

from __future__ import annotations

import re

import structlog

from sediman.agent.browser_agent import BrowserResult
from sediman.agent.state import AgentState, Strategy
from sediman.agent.types import AgentResult, StepEvent
from sediman.browser.session import BrowserSession
from sediman.llm.provider import LLMProvider

logger = structlog.get_logger()


class UrlHandler:
    """Handles URL-only navigation tasks.

    This handler detects simple navigation tasks and executes
    them without any LLM planning overhead.
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

        _SIMPLE_URL_RE = re.compile(
            r'^(?:go\s+to|open|visit|browse|navigate\s+to)\s+https?://\S+$',
            re.IGNORECASE
        )
        self._url_pattern = _SIMPLE_URL_RE

    def matches(self, task: str, conversation: list[dict[str, str]]) -> bool:
        """Check if task matches URL-only pattern."""
        return bool(self._url_pattern.match(task.strip())) and not conversation

    async def execute(
        self,
        task: str,
        state: AgentState,
        memory_context: str = "",
        on_streaming_text=None,
    ) -> AgentResult:
        """Execute URL navigation task."""
        url = task.strip().split()[-1]

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
                action=f"navigate: {url}",
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
        """Get or create browser agent for URL navigation."""
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
            turbo_mode=False,
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
