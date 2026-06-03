"""Direct browser execution strategy."""

from __future__ import annotations

from typing import Any, Callable

import structlog

from sediman.agent.browser_agent import BrowserSubagent, BrowserResult
from sediman.agent.execution.executor import ExecutionResult, Executor
from sediman.agent.state import AgentState, PlanStep
from sediman.agent.tool_dispatch import ToolLoop
from sediman.browser.session import BrowserSession
from sediman.llm.provider import LLMProvider
from sediman.agent.guardrails import Budget

logger = structlog.get_logger()


class DirectExecutor(Executor):
    """Executes steps directly via browser or tool loop.

    This executor handles two modes:
    1. Browser agent execution for complex browser tasks
    2. Tool loop execution for more granular control
    """

    def __init__(
        self,
        browser_session: BrowserSession,
        llm_provider: LLMProvider,
        tool_registry,
        memory_context: str | None = None,
        conversation: list[dict[str, str]] | None = None,
        on_streaming_text: Callable[[str, str], None] | None = None,
        flash_mode: bool = True,
        max_steps: int = 25,
        budget: Budget | None = None,
        browser_use_llm: Any | None = None,
    ):
        self.browser = browser_session
        self.llm = llm_provider
        self.tool_registry = tool_registry
        self.memory_context = memory_context
        self.conversation = conversation or []
        self.on_streaming_text = on_streaming_text
        self.flash_mode = flash_mode
        self.max_steps = max_steps
        self.budget = budget or Budget()
        self.browser_use_llm = browser_use_llm

    async def execute(
        self,
        state: AgentState,
        step: PlanStep,
    ) -> ExecutionResult:
        """Execute step via tool loop first, fallback to browser agent."""
        # Try tool loop execution first
        tool_result = await self._try_tool_loop_execution(state, step)
        if tool_result is not None:
            return tool_result

        # Fallback to browser agent
        return await self._execute_via_browser_agent(state, step)

    async def _try_tool_loop_execution(
        self,
        state: AgentState,
        step: PlanStep,
    ) -> ExecutionResult | None:
        """Try executing via tool loop.

        Returns None if tool loop is not available or fails,
        indicating browser agent fallback should be used.
        """
        try:
            from sediman.browser.tools import get_default_browser_controller, set_default_browser_controller
            from sediman.browser.controller import BrowserController
            ctrl = get_default_browser_controller()
            if ctrl is None:
                ctrl = BrowserController(headless=self.browser.headless)
                try:
                    browser_obj = self.browser.browser
                    if browser_obj is not None:
                        try:
                            page = await browser_obj.get_current_page()
                            if page:
                                ctrl._own_page = page
                        except Exception:
                            logger.debug("browser_page_extract_failed")
                except Exception:
                    logger.debug("browser_obj_access_failed")
            set_default_browser_controller(ctrl)
        except Exception as e:
            logger.debug("tool_loop_browser_ctrl_failed", error=str(e))
            return None

        if not self.tool_registry.has_tool("browser_navigate"):
            try:
                from sediman.browser.tools import register_browser_tools
                register_browser_tools(self.tool_registry)
            except Exception as e:
                logger.debug("tool_loop_register_browser_failed", error=str(e))
                return None

        tool_loop = ToolLoop(
            llm=self.llm,
            registry=self.tool_registry,
            max_rounds=min(25, self.max_steps),
            budget=self.budget,
        )

        try:
            from sediman.agent.prompts.builder import PromptBuilder
            prompt_builder = PromptBuilder(flash_mode=self.flash_mode)
            system_prompt = prompt_builder.build_system_prompt(
                task=step.description,
                memory_context=self.memory_context,
            )
        except Exception:
            system_parts = [
                "You are Sediman, an autonomous browser automation agent.",
                "Use browser tools to complete the task step by step.",
                "Always start with browser_navigate, then browser_snapshot to see the page.",
                "Use browser_click/browser_type to interact with elements by their ref_id.",
                "After completing the task, respond with a summary of what you did and found.",
            ]
            system_prompt = "\n".join(system_parts)

        context_parts = []
        if self.conversation:
            for msg in self.conversation[-6:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")[:200]
                context_parts.append(f"{role}: {content}")
        if state.observations:
            for obs in state.observations[-3:]:
                context_parts.append(f"Previous observation: {obs.content[:200]}")

        user_content = step.description
        if context_parts:
            user_content = (
                f"Context:\n" + "\n".join(context_parts)
                + f"\n\nCurrent task: {step.description}"
            )

        messages = [{"role": "user", "content": user_content}]

        def _on_tool_streaming(token: str) -> None:
            if self.on_streaming_text:
                self.on_streaming_text(token, "executing")

        try:
            response = await tool_loop.run_streaming(
                messages=messages,
                system=system_prompt,
                on_tool_call=lambda name, args: None,
                on_streaming_text=_on_tool_streaming if self.on_streaming_text else None,
            )
            result = response.text or ""
            if not result or len(result.strip()) < 50:
                return None

            return ExecutionResult(
                content=result,
                success=True,
                actions=[{"action": "tool_loop", "task": step.description[:100]}],
            )
        except Exception as e:
            logger.warning("tool_loop_execution_failed", error=str(e))
            return None

    async def _execute_via_browser_agent(
        self,
        state: AgentState,
        step: PlanStep,
    ) -> ExecutionResult:
        """Execute step via browser agent."""
        recording_name = self._get_active_recording_name()
        browser_agent = self._get_browser_agent(recording_name=recording_name, task=step.description)

        try:
            browser_result: BrowserResult = await browser_agent.run(task=step.description)

            if browser_agent._browser_use_llm is not None:
                self.browser_use_llm = browser_agent._browser_use_llm

            return ExecutionResult(
                content=browser_result.text,
                success=not self._looks_like_error(browser_result.text),
                actions=browser_result.actions,
                metadata={"browser_actions": len(browser_result.actions)},
            )
        except Exception as e:
            logger.warning("browser_agent_execution_failed", error=str(e))
            return ExecutionResult(
                content=f"Browser agent execution failed: {e}",
                success=False,
                error=str(e),
            )

    def _get_browser_agent(self, recording_name: str | None = None, task: str = "") -> BrowserSubagent:
        """Get or create browser agent instance."""
        from sediman.agentbrowser.session import AgentBrowserSession

        if isinstance(self.browser, AgentBrowserSession):
            return self._get_agent_browser_agent(recording_name=recording_name, task=task)

        return BrowserSubagent(
            browser_session=self.browser,
            llm_provider=self.llm,
            max_steps=self.max_steps,
            flash_mode=self.flash_mode,
            turbo_mode=False,
            on_browser_step=None,
            conversation=self.conversation,
            recording_name=recording_name,
            memory_context=self.memory_context or "",
            browser_use_llm=self.browser_use_llm,
        )

    def _get_agent_browser_agent(self, recording_name: str | None = None, task: str = "") -> BrowserSubagent:
        """Get agent-browser specific browser agent."""
        from sediman.agentbrowser.subagent import AgentBrowserSubagent

        return AgentBrowserSubagent(
            browser_session=self.browser,
            llm_provider=self.llm,
            max_steps=self.max_steps,
            on_browser_step=None,
            conversation=self.conversation,
            memory_context=self.memory_context or "",
            recording_name=recording_name,
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

    def _looks_like_error(self, text: str) -> bool:
        """Check if text looks like an error message."""
        from sediman.errors import looks_like_error
        return looks_like_error(text)
