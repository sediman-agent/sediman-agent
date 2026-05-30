from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sediman.agentbrowser.session import AgentBrowserSession


def _make_session(**kwargs) -> AgentBrowserSession:
    return AgentBrowserSession(**kwargs)


class TestAgentBrowserSessionInit:
    def test_default_headless(self):
        s = _make_session()
        assert s.headless is True

    def test_headless_false(self):
        s = _make_session(headless=False)
        assert s.headless is False

    def test_not_started(self):
        s = _make_session()
        assert s.is_started is False

    def test_is_stealth_false(self):
        s = _make_session()
        assert s.is_stealth is False

    def test_browser_returns_none_before_start(self):
        s = _make_session()
        assert s.browser is None


class TestAgentBrowserSessionStart:
    @pytest.mark.asyncio
    async def test_start_creates_client(self):
        s = _make_session()

        with patch.object(s._process, "start", new_callable=AsyncMock):
            await s.start()
            assert s.is_started is True
            assert s.browser is not None

    @pytest.mark.asyncio
    async def test_start_idempotent(self):
        s = _make_session()
        s._started = True
        s._client = MagicMock()

        with patch.object(s._process, "start", new_callable=AsyncMock) as mock_start:
            await s.start()
            mock_start.assert_not_called()

    @pytest.mark.asyncio
    async def test_prewarm_calls_start(self):
        s = _make_session()

        with patch.object(s, "start", new_callable=AsyncMock) as mock_start:
            await s.prewarm()
            mock_start.assert_called_once()


class TestAgentBrowserSessionStop:
    @pytest.mark.asyncio
    async def test_stop_clears_state(self):
        s = _make_session()
        s._started = True
        s._client = MagicMock()
        s._client.close = AsyncMock()

        with patch.object(s._process, "stop", new_callable=AsyncMock):
            await s.stop()
            assert s.is_started is False
            assert s._client is None

    @pytest.mark.asyncio
    async def test_stop_handles_client_close_error(self):
        s = _make_session()
        s._started = True
        s._client = MagicMock()
        s._client.close = AsyncMock(side_effect=RuntimeError("oops"))

        with patch.object(s._process, "stop", new_callable=AsyncMock):
            await s.stop()
            assert s.is_started is False

    @pytest.mark.asyncio
    async def test_stop_handles_process_stop_error(self):
        s = _make_session()
        s._started = True
        s._client = MagicMock()
        s._client.close = AsyncMock()

        with patch.object(s._process, "stop", new_callable=AsyncMock, side_effect=RuntimeError("boom")):
            await s.stop()
            assert s.is_started is False

    @pytest.mark.asyncio
    async def test_stop_noop_when_not_started(self):
        s = _make_session()
        with patch.object(s._process, "stop", new_callable=AsyncMock) as mock_stop:
            await s.stop()
            mock_stop.assert_called_once()


class TestAgentBrowserSessionProperties:
    @pytest.mark.asyncio
    async def test_browser_returns_client_after_start(self):
        s = _make_session()

        with patch.object(s._process, "start", new_callable=AsyncMock):
            await s.start()
            assert s.browser is not None
            assert s.browser is s._client

    @pytest.mark.asyncio
    async def test_get_client_returns_client(self):
        s = _make_session()

        with patch.object(s._process, "start", new_callable=AsyncMock):
            await s.start()
            assert s.get_client() is s._client

    def test_get_client_returns_none_before_start(self):
        s = _make_session()
        assert s.get_client() is None


class TestAgentBrowserSessionStubs:
    @pytest.mark.asyncio
    async def test_take_screenshot_returns_none(self):
        s = _make_session()
        assert await s.take_screenshot() is None

    @pytest.mark.asyncio
    async def test_save_state_noop(self):
        s = _make_session()
        await s.save_state("test")

    @pytest.mark.asyncio
    async def test_load_state_returns_false(self):
        s = _make_session()
        assert await s.load_state("test") is False
