"""Tool loop execution strategy for granular browser control."""

from __future__ import annotations

from typing import Any, Callable

import structlog

from sediman.agent.execution.executor import ExecutionResult, Executor
from sediman.agent.state import AgentState, PlanStep
from sediman.agent.tool_dispatch import ToolRegistry
from sediman.browser.session import BrowserSession
from sediman.llm.provider import LLMProvider
from sediman.agent.guardrails import Budget

logger = structlog.get_logger()


class ToolLoopExecutor(Executor):
    """Executes steps using the tool loop for granular control.

    This executor uses the ToolLoop class to execute steps by
    iteratively calling tools until the task is complete.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        tool_registry: ToolRegistry,
        budget: Budget | None = None,
        on_streaming_text: Callable[[str, str], None] | None = None,
        max_rounds: int = 25,
    ):
        self.llm = llm_provider
        self.tool_registry = tool_registry
        self.budget = budget or Budget()
        self.on_streaming_text = on_streaming_text
        self.max_rounds = max_rounds

    async def execute(
        self,
        state: AgentState,
        step: PlanStep,
        system_prompt: str = "",
        context_messages: list[dict[str, str]] | None = None,
    ) -> ExecutionResult:
        """Execute step using tool loop."""
        from sediman.agent.tool_dispatch import ToolLoop

        tool_loop = ToolLoop(
            llm=self.llm,
            registry=self.tool_registry,
            max_rounds=self.max_rounds,
            budget=self.budget,
        )

        messages = context_messages or [{"role": "user", "content": step.description}]

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
                return ExecutionResult(
                    content=result or "Insufficient output from tool loop",
                    success=False,
                    error="Tool loop produced insufficient output",
                )

            return ExecutionResult(
                content=result,
                success=True,
                actions=[{"action": "tool_loop", "task": step.description[:100]}],
                metadata={"tool_loop_rounds": getattr(tool_loop, '_rounds', 0)},
            )

        except Exception as e:
            logger.warning("tool_loop_execution_failed", error=str(e))
            return ExecutionResult(
                content=f"Tool loop execution failed: {e}",
                success=False,
                error=str(e),
            )
