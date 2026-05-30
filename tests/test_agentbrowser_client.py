from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sediman.agentbrowser.client import AgentBrowserClient
from sediman.agentbrowser.process import AgentBrowserProcess


def _make_process(
    stdin: AsyncMock | None = None,
    stdout: AsyncMock | None = None,
) -> MagicMock:
    proc = MagicMock(spec=AgentBrowserProcess)
    proc.stdin = stdin or AsyncMock()
    proc.stdout = stdout or AsyncMock()
    proc.is_running = True
    return proc


def _make_client(process: MagicMock | None = None) -> AgentBrowserClient:
    if process is None:
        process = _make_process()
    return AgentBrowserClient(process)


class TestAgentBrowserClientInit:
    def test_initial_state(self):
        p = _make_process()
        client = AgentBrowserClient(p)
        assert client.is_initialized is False
        assert client._request_id == 0
        assert client._pending == {}


class TestAgentBrowserClientNotificationHandler:
    def test_set_notification_handler(self):
        client = _make_client()
        handler = MagicMock()
        client.set_notification_handler(handler)
        assert client._on_notification is handler


class TestAgentBrowserClientReadLoop:
    @pytest.mark.asyncio
    async def test_read_loop_dispatches_response(self):
        response_line = json.dumps({"jsonrpc": "2.0", "id": 1, "result": {"content": "ok"}}).encode() + b"\n"

        stdout = AsyncMock()
        stdout.readline = AsyncMock(side_effect=[response_line, b""])

        client = _make_client()
        future: asyncio.Future[dict] = asyncio.get_event_loop().create_future()
        client._pending[1] = future

        await client._read_loop(stdout)

        assert future.done()
        assert future.result()["result"]["content"] == "ok"

    @pytest.mark.asyncio
    async def test_read_loop_dispatches_notification(self):
        notification_line = json.dumps({
            "jsonrpc": "2.0",
            "method": "agent.thinking",
            "params": {"chunk": "reasoning..."},
        }).encode() + b"\n"

        stdout = AsyncMock()
        stdout.readline = AsyncMock(side_effect=[notification_line, b""])

        handler = MagicMock()
        client = _make_client()
        client.set_notification_handler(handler)

        await client._read_loop(stdout)

        assert len(client._notifications) == 1
        assert client._notifications[0]["method"] == "agent.thinking"
        handler.assert_called_once()

    @pytest.mark.asyncio
    async def test_read_loop_skips_invalid_json(self):
        stdout = AsyncMock()
        stdout.readline = AsyncMock(side_effect=[b"not json\n", b""])

        client = _make_client()
        await client._read_loop(stdout)

        assert len(client._notifications) == 0

    @pytest.mark.asyncio
    async def test_read_loop_skips_empty_lines(self):
        stdout = AsyncMock()
        stdout.readline = AsyncMock(side_effect=[b"\n", b"   \n", b""])

        client = _make_client()
        await client._read_loop(stdout)

        assert len(client._notifications) == 0

    @pytest.mark.asyncio
    async def test_read_loop_stops_on_empty_bytes(self):
        stdout = AsyncMock()
        stdout.readline = AsyncMock(return_value=b"")

        client = _make_client()
        await client._read_loop(stdout)
        assert True

    @pytest.mark.asyncio
    async def test_read_loop_stops_on_exception(self):
        stdout = AsyncMock()
        stdout.readline = AsyncMock(side_effect=RuntimeError("boom"))

        client = _make_client()
        await client._read_loop(stdout)
        assert True


class TestAgentBrowserClientSendRequest:
    @pytest.mark.asyncio
    async def test_send_request_writes_jsonrpc(self):
        process = _make_process()
        client = AgentBrowserClient(process)

        async def _fake_read_loop(stdout):
            pass

        with patch.object(client, "_read_loop", new_callable=AsyncMock, side_effect=_fake_read_loop):
            response_future: asyncio.Future[dict] = asyncio.get_event_loop().create_future()
            response_future.set_result({"jsonrpc": "2.0", "id": 1, "result": {}})

            async def _send_and_resolve():
                send_task = asyncio.create_task(client._send_request("agent.init", {"apiKey": "k"}))
                await asyncio.sleep(0.01)
                pending = client._pending.get(1)
                if pending and not pending.done():
                    pending.set_result({"jsonrpc": "2.0", "id": 1, "result": {}})
                return await send_task

            result = await _send_and_resolve()
            assert result["result"] == {}

            process.stdin.write.assert_called_once()
            written = process.stdin.write.call_args[0][0]
            msg = json.loads(written.decode())
            assert msg["jsonrpc"] == "2.0"
            assert msg["method"] == "agent.init"
            assert msg["params"]["apiKey"] == "k"

    @pytest.mark.asyncio
    async def test_send_request_raises_on_no_stdin(self):
        process = _make_process()
        process.stdin = None
        client = AgentBrowserClient(process)

        client._reader_task = MagicMock()

        with pytest.raises(RuntimeError, match="stdin not available"):
            await client._send_request("agent.init")

    @pytest.mark.asyncio
    async def test_send_request_increments_id(self):
        process = _make_process()
        client = AgentBrowserClient(process)

        client._reader_task = MagicMock()

        for i in range(3):
            response_future: asyncio.Future[dict] = asyncio.get_event_loop().create_future()
            response_future.set_result({"jsonrpc": "2.0", "id": i + 1, "result": {}})

            async def _send():
                task = asyncio.create_task(client._send_request("test"))
                await asyncio.sleep(0.01)
                pid = i + 1
                pending = client._pending.get(pid)
                if pending and not pending.done():
                    pending.set_result({"jsonrpc": "2.0", "id": pid, "result": {}})
                return await task

            await _send()

        assert client._request_id == 3


class TestAgentBrowserClientInit:
    @pytest.mark.asyncio
    async def test_init_sends_correct_params(self):
        process = _make_process()
        client = AgentBrowserClient(process)

        async def _mock_send_request(method, params=None):
            assert method == "agent.init"
            assert params["apiKey"] == "test-key"
            assert params["model"] == "gpt-4o"
            assert params["baseURL"] == "https://api.example.com"
            assert params["maxRounds"] == 30
            assert params["customInstructions"] == "be helpful"
            return {"jsonrpc": "2.0", "id": 1, "result": {"status": "ok"}}

        client._send_request = _mock_send_request
        result = await client.init(
            api_key="test-key",
            model="gpt-4o",
            base_url="https://api.example.com",
            max_rounds=30,
            custom_instructions="be helpful",
        )
        assert result is True
        assert client.is_initialized is True

    @pytest.mark.asyncio
    async def test_init_returns_false_on_error(self):
        client = _make_client()

        async def _mock_send_request(method, params=None):
            return {"jsonrpc": "2.0", "id": 1, "error": {"code": -1, "message": "bad key"}}

        client._send_request = _mock_send_request
        result = await client.init(api_key="bad-key")
        assert result is False
        assert client.is_initialized is False

    @pytest.mark.asyncio
    async def test_init_omits_optional_params(self):
        client = _make_client()

        async def _mock_send_request(method, params=None):
            assert "baseURL" not in params
            assert "customInstructions" not in params
            return {"jsonrpc": "2.0", "id": 1, "result": {}}

        client._send_request = _mock_send_request
        result = await client.init(api_key="k")
        assert result is True


class TestAgentBrowserClientChat:
    @pytest.mark.asyncio
    async def test_chat_returns_content_from_dict_result(self):
        client = _make_client()

        async def _mock_send(method, params=None):
            return {"jsonrpc": "2.0", "id": 1, "result": {"content": "I found the price: $299"}}

        client._send_request = _mock_send
        result = await client.chat("find the price")
        assert result == "I found the price: $299"

    @pytest.mark.asyncio
    async def test_chat_returns_string_result(self):
        client = _make_client()

        async def _mock_send(method, params=None):
            return {"jsonrpc": "2.0", "id": 1, "result": "plain text response"}

        client._send_request = _mock_send
        result = await client.chat("do something")
        assert result == "plain text response"

    @pytest.mark.asyncio
    async def test_chat_returns_error_message(self):
        client = _make_client()

        async def _mock_send(method, params=None):
            return {"jsonrpc": "2.0", "id": 1, "error": {"message": "timeout"}}

        client._send_request = _mock_send
        result = await client.chat("search")
        assert "Agent-browser error" in result
        assert "timeout" in result

    @pytest.mark.asyncio
    async def test_chat_sends_message_param(self):
        client = _make_client()
        captured = {}

        async def _mock_send(method, params=None):
            captured["method"] = method
            captured["params"] = params
            return {"jsonrpc": "2.0", "id": 1, "result": {"content": ""}}

        client._send_request = _mock_send
        await client.chat("go to google.com")
        assert captured["method"] == "agent.chat"
        assert captured["params"]["message"] == "go to google.com"


class TestAgentBrowserClientGetHistory:
    @pytest.mark.asyncio
    async def test_get_history_returns_list(self):
        client = _make_client()

        async def _mock_send(method, params=None):
            return {
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "history": [
                        {"role": "user", "content": "hello"},
                        {"role": "tool", "name": "navigate", "content": "navigated"},
                    ]
                },
            }

        client._send_request = _mock_send
        history = await client.get_history()
        assert len(history) == 2
        assert history[1]["role"] == "tool"

    @pytest.mark.asyncio
    async def test_get_history_returns_empty_on_error(self):
        client = _make_client()

        async def _mock_send(method, params=None):
            return {"jsonrpc": "2.0", "id": 1, "error": {"code": -1}}

        client._send_request = _mock_send
        history = await client.get_history()
        assert history == []


class TestAgentBrowserClientStop:
    @pytest.mark.asyncio
    async def test_stop_sends_request(self):
        client = _make_client()
        called = False

        async def _mock_send(method, params=None):
            nonlocal called
            called = True
            assert method == "agent.stop"
            return {"jsonrpc": "2.0", "id": 1, "result": {}}

        client._send_request = _mock_send
        await client.stop()
        assert called

    @pytest.mark.asyncio
    async def test_stop_swallows_exceptions(self):
        client = _make_client()

        async def _mock_send(method, params=None):
            raise RuntimeError("connection lost")

        client._send_request = _mock_send
        await client.stop()


class TestAgentBrowserClientShutdown:
    @pytest.mark.asyncio
    async def test_shutdown_sends_request(self):
        client = _make_client()

        async def _mock_send(method, params=None):
            assert method == "agent.shutdown"
            return {"jsonrpc": "2.0", "id": 1, "result": {}}

        client._send_request = _mock_send
        await client.shutdown()

    @pytest.mark.asyncio
    async def test_shutdown_swallows_exceptions(self):
        client = _make_client()

        async def _mock_send(method, params=None):
            raise ConnectionError("gone")

        client._send_request = _mock_send
        await client.shutdown()


class TestAgentBrowserClientClose:
    @pytest.mark.asyncio
    async def test_close_cancels_reader_task(self):
        client = _make_client()

        async def _noop():
            pass

        mock_task = asyncio.create_task(_noop())
        client._reader_task = mock_task

        shutdown_called = False

        async def _mock_shutdown():
            nonlocal shutdown_called
            shutdown_called = True

        client.shutdown = _mock_shutdown

        await client.close()
        assert shutdown_called
        assert client._reader_task is None
        assert client._pending == {}

    @pytest.mark.asyncio
    async def test_close_noop_when_no_reader(self):
        client = _make_client()
        client.shutdown = AsyncMock()
        await client.close()
        assert client._pending == {}
