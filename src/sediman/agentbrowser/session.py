from __future__ import annotations

from typing import Any
from collections.abc import Callable

import structlog

from sediman.agentbrowser.client import AgentBrowserClient
from sediman.agentbrowser.process import AgentBrowserProcess

logger = structlog.get_logger()


class AgentBrowserSession:
    """Drop-in replacement for BrowserSession that uses agent-browser via sidecar."""

    def __init__(
        self,
        headless: bool = True,
        user_data_dir: str | None = None,
        on_screenshot: Callable[[str], None] | None = None,
        binary: str | None = None,
    ):
        self.headless = headless
        self.user_data_dir = user_data_dir
        self.on_screenshot = on_screenshot
        self._process = AgentBrowserProcess(binary=binary)
        self._client: AgentBrowserClient | None = None
        self._started = False

    @property
    def is_started(self) -> bool:
        return self._started and self._client is not None

    @property
    def is_stealth(self) -> bool:
        return False

    @property
    def browser(self) -> Any:
        return self._client

    async def prewarm(self) -> None:
        await self.start()

    async def start(self) -> None:
        if self._started:
            return

        await self._process.start()
        self._client = AgentBrowserClient(self._process)
        self._started = True
        logger.info("agent_browser_session_started")

    async def stop(self) -> None:
        if self._client:
            try:
                await self._client.close()
            except Exception as e:
                logger.debug("client_close_failed", error=str(e))
            self._client = None
        try:
            await self._process.stop()
        except Exception as e:
            logger.debug("process_stop_failed", error=str(e))
        self._started = False
        logger.info("agent_browser_session_stopped")

    async def take_screenshot(self) -> str | None:
        return None

    async def save_state(self, name: str) -> None:
        pass

    async def load_state(self, name: str) -> bool:
        return False

    def get_client(self) -> AgentBrowserClient | None:
        return self._client
