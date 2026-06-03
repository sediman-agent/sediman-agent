"""Skill-based execution strategy."""

from __future__ import annotations

from typing import Any

import structlog

from sediman.agent.execution.executor import ExecutionResult, Executor
from sediman.agent.state import AgentState, PlanStep
from sediman.browser.session import BrowserSession
from sediman.llm.provider import LLMProvider

logger = structlog.get_logger()


class SkillExecutor(Executor):
    """Executes steps using predefined skills.

    This executor loads and executes skills from the skill engine,
    falling back to browser agent execution if the skill is not found.
    """

    def __init__(
        self,
        browser_session: BrowserSession,
        llm_provider: LLMProvider,
        skill_engine: Any | None = None,
        direct_executor: Executor | None = None,
    ):
        self.browser = browser_session
        self.llm = llm_provider
        self.skill_engine = skill_engine
        self.direct_executor = direct_executor

    async def execute(
        self,
        state: AgentState,
        step: PlanStep,
        skill_name: str = "",
    ) -> ExecutionResult:
        """Execute step using a skill."""
        if not self.skill_engine:
            return ExecutionResult(
                content="Skill engine not available",
                success=False,
                error="No skill engine configured",
            )

        skill_data = self.skill_engine.read(skill_name)

        if skill_data:
            return await self._execute_with_skill(skill_data, skill_name, state, step)

        # Fallback to direct execution
        if self.direct_executor:
            return await self.direct_executor.execute(state, step)

        return ExecutionResult(
            content=f"Skill '{skill_name}' not found and no fallback executor",
            success=False,
            error=f"Skill not found: {skill_name}",
        )

    async def _execute_with_skill(
        self,
        skill_data: dict[str, Any],
        skill_name: str,
        state: AgentState,
        step: PlanStep,
    ) -> ExecutionResult:
        """Execute step with the given skill."""
        try:
            from sediman.skills.executor import execute_skill

            skill_args = self._extract_skill_arguments(skill_data, state.task or step.description)

            result = await execute_skill(
                skill_data,
                self.browser,
                self.llm,
                engine=self.skill_engine,
                arguments=skill_args,
            )

            self.skill_engine.record_usage(skill_name)

            return ExecutionResult(
                content=result,
                success=not self._looks_like_error(result),
                metadata={"skill_name": skill_name},
            )

        except Exception as e:
            logger.warning("skill_execution_failed", skill=skill_name, error=str(e))
            return ExecutionResult(
                content=f"Skill execution failed: {e}",
                success=False,
                error=str(e),
            )

    def _extract_skill_arguments(self, skill: dict[str, Any], task: str) -> dict[str, str]:
        """Extract arguments from task for skill execution."""
        args: dict[str, str] = {}
        skill_name = skill.get("name", "")
        task_lower = task.lower()

        if skill_name.lower() in task_lower:
            prefix = task_lower.split(skill_name.lower())[-1].strip()
            args["ARGUMENTS"] = prefix
            args["0"] = prefix
        else:
            args["ARGUMENTS"] = task
            args["0"] = task

        return args

    def _looks_like_error(self, text: str) -> bool:
        """Check if text looks like an error message."""
        from sediman.errors import looks_like_error
        return looks_like_error(text)
