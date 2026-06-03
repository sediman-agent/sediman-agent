"""Delegation execution strategy for subagent-based execution."""

from __future__ import annotations

from typing import Any

import structlog

from sediman.agent.delegate import delegate_parallel
from sediman.agent.execution.executor import ExecutionResult, Executor
from sediman.agent.state import AgentState, PlanStep
from sediman.agent.subagents.factory import SubagentFactory
from sediman.agent.subagents.result import SubagentResult
from sediman.browser.session import BrowserSession
from sediman.llm.provider import LLMProvider

logger = structlog.get_logger()


class DelegateExecutor(Executor):
    """Executes steps by delegating to specialized subagents.

    This executor handles both single and parallel delegation,
    using either the subagent factory or legacy delegate_parallel.
    """

    def __init__(
        self,
        browser_session: BrowserSession,
        llm_provider: LLMProvider,
        subagent_factory: SubagentFactory | None = None,
    ):
        self.browser = browser_session
        self.llm = llm_provider
        self.subagent_factory = subagent_factory

    async def execute(
        self,
        state: AgentState,
        step: PlanStep,
    ) -> ExecutionResult:
        """Execute step via delegation to a subagent."""
        if step.subagent_type and self.subagent_factory:
            return await self._execute_via_factory(state, step)

        return await self._execute_via_legacy_delegate(state, step)

    async def _execute_via_factory(
        self,
        state: AgentState,
        step: PlanStep,
    ) -> ExecutionResult:
        """Execute via subagent factory."""
        if not self.subagent_factory:
            return ExecutionResult(
                content="Subagent factory not available",
                success=False,
                error="No subagent factory configured",
            )

        parent_context = {
            "task": state.task,
            "errors": [e for e in state.errors],
            "observations": [o.content[:200] for o in state.observations[-3:]],
        }

        try:
            result: SubagentResult = await self.subagent_factory.spawn(
                agent_type=step.subagent_type,
                task=step.description,
                parent_context=parent_context,
            )

            if result.artifacts:
                for art in result.artifacts:
                    logger.info("subagent_artifact", kind=art.kind, name=art.name)

            return ExecutionResult(
                content=result.summary,
                success=result.success,
                actions=result.actions_taken,
                metadata={
                    "subagent_type": step.subagent_type,
                    "iterations": result.iterations,
                },
            )
        except Exception as e:
            logger.warning("subagent_delegation_failed", error=str(e))
            return ExecutionResult(
                content=f"Delegation failed: {e}",
                success=False,
                error=str(e),
            )

    async def _execute_via_legacy_delegate(
        self,
        state: AgentState,
        step: PlanStep,
    ) -> ExecutionResult:
        """Execute via legacy delegate_parallel."""
        try:
            result = await delegate_parallel(
                tasks=[step.description],
                browser_session=self.browser,
                llm_provider=self.llm,
                max_concurrent=1,
            )

            content = result[0] if result else "No result from delegate"
            return ExecutionResult(
                content=content,
                success=bool(result),
                metadata={"legacy_delegate": True},
            )
        except Exception as e:
            logger.warning("legacy_delegation_failed", error=str(e))
            return ExecutionResult(
                content=f"Delegation failed: {e}",
                success=False,
                error=str(e),
            )

    async def execute_parallel(
        self,
        state: AgentState,
        steps: list[PlanStep],
    ) -> list[ExecutionResult]:
        """Execute multiple delegation steps in parallel."""
        if not steps:
            return []

        state.phase = AgentPhase.DELEGATING

        # If all steps have subagent_type, use factory parallel spawn
        if all(s.subagent_type for s in steps) and self.subagent_factory:
            return await self._execute_parallel_via_factory(state, steps)

        # Fallback to legacy delegate_parallel
        return await self._execute_parallel_via_legacy(state, steps)

    async def _execute_parallel_via_factory(
        self,
        state: AgentState,
        steps: list[PlanStep],
    ) -> list[ExecutionResult]:
        """Execute parallel via subagent factory."""
        parent_context = {
            "task": state.task,
            "errors": [e for e in state.errors],
            "observations": [o.content[:200] for o in state.observations[-3:]],
        }

        specs = [(s.subagent_type or "browser", s.description) for s in steps]

        try:
            results: list[SubagentResult] = await self.subagent_factory.spawn_parallel(
                specs=specs,
                parent_context=parent_context,
                max_concurrent=min(3, len(steps)),
            )

            execution_results = []
            for step, result in zip(steps, results):
                step.result = result.summary
                step.status = "completed" if result.success else "failed"
                execution_results.append(
                    ExecutionResult(
                        content=result.summary,
                        success=result.success,
                        actions=result.actions_taken,
                        metadata={"subagent_type": step.subagent_type},
                    )
                )

            logger.info("parallel_subagent_delegation_complete", count=len(results))
            return execution_results

        except Exception as e:
            logger.warning("parallel_subagent_delegation_failed", error=str(e))
            return [
                ExecutionResult(
                    content=f"Subagent delegation failed: {e}",
                    success=False,
                    error=str(e),
                )
                for _ in steps
            ]

    async def _execute_parallel_via_legacy(
        self,
        state: AgentState,
        steps: list[PlanStep],
    ) -> list[ExecutionResult]:
        """Execute parallel via legacy delegate_parallel."""
        tasks = [s.description for s in steps]

        try:
            results = await delegate_parallel(
                tasks=tasks,
                browser_session=self.browser,
                llm_provider=self.llm,
                max_concurrent=min(3, len(tasks)),
            )

            execution_results = []
            for step, result in zip(steps, results):
                step.result = result
                step.status = "completed"
                execution_results.append(
                    ExecutionResult(
                        content=result,
                        success=True,
                        metadata={"legacy_delegate": True},
                    )
                )

            logger.info("parallel_delegation_complete", count=len(results))
            return execution_results

        except Exception as e:
            logger.warning("parallel_delegation_failed", error=str(e))
            return [
                ExecutionResult(
                    content=f"Delegation failed: {e}",
                    success=False,
                    error=str(e),
                )
                for _ in steps
            ]
