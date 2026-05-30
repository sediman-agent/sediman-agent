from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sediman.agentbrowser.subagent import AgentBrowserSubagent, BrowserResult
from sediman.agentbrowser.session import AgentBrowserSession


def _make_llm(model: str = "gpt-4", base_url: str | None = None) -> MagicMock:
    llm = MagicMock()
    llm.model = model
    llm.base_url = base_url
    return llm


def _make_session_with_client(client: MagicMock | None = None) -> AgentBrowserSession:
    session = AgentBrowserSession()
    if client is not None:
        session._client = client
        session._started = True
    return session


class TestBrowserResult:
    def test_dataclass_fields(self):
        r = BrowserResult(text="done", actions=[{"action": "click"}])
        assert r.text == "done"
        assert len(r.actions) == 1

    def test_default_actions(self):
        r = BrowserResult(text="ok", actions=[])
        assert r.actions == []


class TestAgentBrowserSubagentInit:
    def test_stores_params(self):
        session = _make_session_with_client()
        llm = _make_llm()
        sub = AgentBrowserSubagent(
            browser_session=session,
            llm_provider=llm,
            max_steps=25,
        )
        assert sub.browser is session
        assert sub.llm is llm
        assert sub.max_steps == 25

    def test_default_params(self):
        sub = AgentBrowserSubagent(
            browser_session=_make_session_with_client(),
            llm_provider=_make_llm(),
        )
        assert sub._on_step is None
        assert sub._conversation == []
        assert sub._memory_context is None
        assert sub._recording_name is None


class TestAgentBrowserSubagentRun:
    @pytest.mark.asyncio
    async def test_returns_error_when_no_client(self):
        session = AgentBrowserSession()
        sub = AgentBrowserSubagent(
            browser_session=session,
            llm_provider=_make_llm(),
        )
        result = await sub.run("do something")
        assert "not available" in result.text
        assert result.actions == []

    @pytest.mark.asyncio
    async def test_initializes_client_on_first_run(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = False
        mock_client.init = AsyncMock(return_value=True)
        mock_client.chat = AsyncMock(return_value="task completed")
        mock_client.get_history = AsyncMock(return_value=[])

        session = _make_session_with_client(mock_client)
        llm = _make_llm()

        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            sub = AgentBrowserSubagent(
                browser_session=session,
                llm_provider=llm,
                max_steps=30,
            )
            result = await sub.run("search for laptops")

        mock_client.init.assert_called_once()
        init_call = mock_client.init.call_args
        assert init_call.kwargs["api_key"] == "test-key"
        assert init_call.kwargs["model"] == "gpt-4"
        assert init_call.kwargs["max_rounds"] == 30
        assert result.text == "task completed"

    @pytest.mark.asyncio
    async def test_returns_failure_when_init_fails(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = False
        mock_client.init = AsyncMock(return_value=False)

        session = _make_session_with_client(mock_client)

        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            sub = AgentBrowserSubagent(
                browser_session=session,
                llm_provider=_make_llm(),
            )
            result = await sub.run("do something")

        assert "Failed to initialize" in result.text
        assert result.actions == []

    @pytest.mark.asyncio
    async def test_skips_init_when_already_initialized(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = True
        mock_client.chat = AsyncMock(return_value="already done")
        mock_client.get_history = AsyncMock(return_value=[])

        session = _make_session_with_client(mock_client)
        sub = AgentBrowserSubagent(
            browser_session=session,
            llm_provider=_make_llm(),
        )
        result = await sub.run("do something")

        mock_client.init.assert_not_called()
        assert result.text == "already done"

    @pytest.mark.asyncio
    async def test_passes_memory_context_as_custom_instructions(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = False
        mock_client.init = AsyncMock(return_value=True)
        mock_client.chat = AsyncMock(return_value="ok")
        mock_client.get_history = AsyncMock(return_value=[])

        session = _make_session_with_client(mock_client)

        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            sub = AgentBrowserSubagent(
                browser_session=session,
                llm_provider=_make_llm(),
                memory_context="user prefers dark mode",
            )
            await sub.run("open settings")

        init_call = mock_client.init.call_args
        assert "user prefers dark mode" in init_call.kwargs["custom_instructions"]

    @pytest.mark.asyncio
    async def test_extracts_tool_actions_from_history(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = True
        mock_client.chat = AsyncMock(return_value="navigated and clicked")
        mock_client.get_history = AsyncMock(return_value=[
            {"role": "user", "content": "go to google"},
            {"role": "tool", "name": "navigate", "content": "navigated to google.com"},
            {"role": "tool", "name": "click", "content": "clicked search button"},
        ])

        session = _make_session_with_client(mock_client)
        sub = AgentBrowserSubagent(
            browser_session=session,
            llm_provider=_make_llm(),
        )
        result = await sub.run("search on google")

        assert len(result.actions) == 2
        assert result.actions[0]["action"] == "tool_call"
        assert result.actions[0]["name"] == "navigate"
        assert result.actions[1]["name"] == "click"

    @pytest.mark.asyncio
    async def test_truncates_tool_content_to_200_chars(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = True
        mock_client.chat = AsyncMock(return_value="done")
        mock_client.get_history = AsyncMock(return_value=[
            {"role": "tool", "name": "scrape", "content": "x" * 500},
        ])

        session = _make_session_with_client(mock_client)
        sub = AgentBrowserSubagent(
            browser_session=session,
            llm_provider=_make_llm(),
        )
        result = await sub.run("scrape page")
        assert len(result.actions[0]["content"]) == 200

    @pytest.mark.asyncio
    async def test_history_error_returns_empty_actions(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = True
        mock_client.chat = AsyncMock(return_value="done")
        mock_client.get_history = AsyncMock(side_effect=RuntimeError("lost"))

        session = _make_session_with_client(mock_client)
        sub = AgentBrowserSubagent(
            browser_session=session,
            llm_provider=_make_llm(),
        )
        result = await sub.run("task")
        assert result.text == "done"
        assert result.actions == []

    @pytest.mark.asyncio
    async def test_calls_on_step_callback(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = True
        mock_client.chat = AsyncMock(return_value="done")
        mock_client.get_history = AsyncMock(return_value=[])

        steps = []
        on_step = lambda action, detail: steps.append((action, detail))

        session = _make_session_with_client(mock_client)
        sub = AgentBrowserSubagent(
            browser_session=session,
            llm_provider=_make_llm(),
            on_browser_step=on_step,
        )
        await sub.run("my task")

        assert ("start", "my task") in steps

    @pytest.mark.asyncio
    async def test_notification_handler_forwards_thinking(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = False
        mock_client.init = AsyncMock(return_value=True)
        mock_client.chat = AsyncMock(return_value="done")
        mock_client.get_history = AsyncMock(return_value=[])

        steps = []
        on_step = lambda action, detail: steps.append((action, detail))

        session = _make_session_with_client(mock_client)

        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            sub = AgentBrowserSubagent(
                browser_session=session,
                llm_provider=_make_llm(),
                on_browser_step=on_step,
            )
            await sub.run("task")

        handler = mock_client.set_notification_handler.call_args[0][0]
        handler({"method": "agent.thinking", "params": {"chunk": "analyzing page..."}})
        assert ("thinking", "analyzing page...") in steps

    @pytest.mark.asyncio
    async def test_notification_handler_forwards_status(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = False
        mock_client.init = AsyncMock(return_value=True)
        mock_client.chat = AsyncMock(return_value="done")
        mock_client.get_history = AsyncMock(return_value=[])

        steps = []
        on_step = lambda action, detail: steps.append((action, detail))

        session = _make_session_with_client(mock_client)

        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            sub = AgentBrowserSubagent(
                browser_session=session,
                llm_provider=_make_llm(),
                on_browser_step=on_step,
            )
            await sub.run("task")

        handler = mock_client.set_notification_handler.call_args[0][0]
        handler({"method": "agent.status", "params": {"status": "clicking button"}})
        assert ("status", "clicking button") in steps

    @pytest.mark.asyncio
    async def test_uses_llm_model_and_base_url(self):
        mock_client = AsyncMock()
        mock_client.is_initialized = False
        mock_client.init = AsyncMock(return_value=True)
        mock_client.chat = AsyncMock(return_value="ok")
        mock_client.get_history = AsyncMock(return_value=[])

        session = _make_session_with_client(mock_client)
        llm = _make_llm(model="gpt-4o-mini", base_url="https://custom.api.com")

        with patch.dict("os.environ", {"OPENAI_API_KEY": "k"}):
            sub = AgentBrowserSubagent(
                browser_session=session,
                llm_provider=llm,
            )
            await sub.run("task")

        init_call = mock_client.init.call_args
        assert init_call.kwargs["model"] == "gpt-4o-mini"
        assert init_call.kwargs["base_url"] == "https://custom.api.com"

    @pytest.mark.asyncio
    async def test_notification_handler_set_even_without_on_step(self):
        mock_client = MagicMock()
        mock_client.is_initialized = False
        mock_client.init = AsyncMock(return_value=True)
        mock_client.chat = AsyncMock(return_value="ok")
        mock_client.get_history = AsyncMock(return_value=[])

        session = _make_session_with_client(mock_client)

        with patch.dict("os.environ", {"OPENAI_API_KEY": "k"}):
            sub = AgentBrowserSubagent(
                browser_session=session,
                llm_provider=_make_llm(),
            )
            await sub.run("task")

        mock_client.set_notification_handler.assert_called_once()

    @pytest.mark.asyncio
    async def test_passes_conversation_context(self):
        mock_client = MagicMock()
        mock_client.is_initialized = False
        mock_client.init = AsyncMock(return_value=True)
        mock_client.chat = AsyncMock(return_value="ok")
        mock_client.get_history = AsyncMock(return_value=[])

        session = _make_session_with_client(mock_client)

        with patch.dict("os.environ", {"OPENAI_API_KEY": "k"}), \
             patch("sediman.utils.format_conversation_context", return_value="user asked about X") as mock_fmt:
            sub = AgentBrowserSubagent(
                browser_session=session,
                llm_provider=_make_llm(),
                conversation=[{"role": "user", "content": "what about X?"}],
            )
            await sub.run("task")

            mock_fmt.assert_called_once()
            init_call = mock_client.init.call_args
            assert "conversation_context" in init_call.kwargs.get("custom_instructions", "")
