"""Schedule handler for cron task scheduling."""

from __future__ import annotations

import structlog

from sediman.agent.planner import ScheduleIntent, TaskPlanner
from sediman.agent.state import AgentState
from sediman.agent.types import AgentResult
from sediman.llm.provider import LLMProvider

logger = structlog.get_logger()


class ScheduleHandler:
    """Handles task scheduling via cron expressions.

    This handler detects scheduling patterns and creates
    cron jobs without full LLM planning.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
    ):
        self.llm = llm_provider
        self._regex_planner = TaskPlanner()

    def matches(self, task: str, conversation: list[dict[str, str]]) -> ScheduleIntent | None:
        """Check if task matches scheduling pattern and return schedule intent."""
        if conversation:
            return None

        regex_plan = self._regex_planner.plan(task)
        return regex_plan.schedule if regex_plan.schedule else None

    async def execute(
        self,
        task: str,
        state: AgentState,
        schedule: ScheduleIntent,
    ) -> AgentResult:
        """Execute scheduling task."""
        result_text = f"Scheduled: {schedule.cron} → {schedule.task}"
        job_id = None

        try:
            from sediman.scheduler.cron import CronManager, validate_cron_expr
            if validate_cron_expr(schedule.cron):
                cron = CronManager()
                job_id = cron.add_job(
                    cron_expr=schedule.cron,
                    task=schedule.task,
                    model=getattr(self.llm, "model", None),
                    base_url=getattr(self.llm, "base_url", None),
                )
        except Exception as e:
            logger.debug("schedule_creation_failed", error=str(e))

        return AgentResult(
            task=task,
            result=result_text,
            scheduled_job_id=job_id,
            schedule_cron=schedule.cron,
            strategy_used="schedule",
        )
