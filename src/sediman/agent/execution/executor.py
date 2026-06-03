"""Base executor interface for step execution strategies."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from sediman.agent.state import AgentState, PlanStep


@dataclass
class ExecutionResult:
    """Result from a step execution."""
    content: str
    success: bool = True
    actions: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def with_action(self, action: dict[str, Any]) -> ExecutionResult:
        """Add an action to the result and return self."""
        self.actions.append(action)
        return self

    def with_metadata(self, key: str, value: Any) -> ExecutionResult:
        """Add metadata to the result and return self."""
        self.metadata[key] = value
        return self


class Executor(ABC):
    """Base class for step execution strategies.

    Each executor implements a specific strategy for executing
    a plan step, such as direct browser execution, delegation
    to subagents, or using a skill.
    """

    @abstractmethod
    async def execute(
        self,
        state: AgentState,
        step: PlanStep,
    ) -> ExecutionResult:
        """Execute a single step and return the result.

        Args:
            state: Current agent state
            step: The step to execute

        Returns:
            ExecutionResult containing the outcome
        """
        pass

    def _should_retry(self, result: ExecutionResult, step: PlanStep) -> bool:
        """Determine if execution should be retried.

        Args:
            result: The execution result
            step: The step that was executed

        Returns:
            True if retry should be attempted
        """
        return not result.success and step.retries < step.max_retries
