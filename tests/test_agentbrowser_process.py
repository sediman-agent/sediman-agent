from __future__ import annotations

import asyncio
import signal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sediman.agentbrowser.process import AgentBrowserProcess


class TestAgentBrowserProcessInit:
    def test_uses_explicit_binary(self):
        p = AgentBrowserProcess(binary="/usr/local/bin/my-agent")
        assert p._binary == "/usr/local/bin/my-agent"

    @patch("shutil.which", return_value=None)
    def test_find_binary_falls_back_to_default(self, mock_which):
        binary = AgentBrowserProcess._find_binary()
        assert binary == "open-browser-agent"

    @patch("shutil.which", side_effect=lambda n: f"/usr/bin/{n}" if n == "open-browser-agent" else None)
    def test_find_binary_finds_open_browser_agent(self, mock_which):
        binary = AgentBrowserProcess._find_binary()
        assert binary == "/usr/bin/open-browser-agent"

    @patch("shutil.which", side_effect=lambda n: "/usr/bin/node" if n == "node" else None)
    def test_find_binary_uses_node_sidecar(self, mock_which):
        with patch("sediman.agentbrowser.process._SOURCE_DIR") as mock_dir:
            mock_dir.__truediv__ = lambda s, o: MagicMock(
                exists=MagicMock(return_value=True),
                __str__=lambda self: f"/src/Openbrowser/ai-agent/open-browser/dist/{o}",
            )
            binary = AgentBrowserProcess._find_binary()
            assert "node" in binary.lower() or "open-browser-agent" in binary

    def test_is_running_false_when_not_started(self):
        p = AgentBrowserProcess(binary="/bin/true")
        assert p.is_running is False

    def test_is_running_false_after_stop(self):
        p = AgentBrowserProcess(binary="/bin/true")
        p._started = True
        p._process = MagicMock()
        p._process.returncode = 1
        assert p.is_running is False


class TestAgentBrowserProcessIsAvailable:
    @patch("shutil.which", return_value="/usr/bin/open-browser-agent")
    def test_available_when_binary_in_path(self, mock_which):
        assert AgentBrowserProcess.is_available() is True

    @patch("shutil.which", return_value=None)
    def test_not_available_when_nothing_found(self, mock_which):
        assert AgentBrowserProcess.is_available() is False


class TestAgentBrowserProcessStart:
    @pytest.mark.asyncio
    async def test_start_idempotent(self):
        p = AgentBrowserProcess(binary="/bin/echo")
        p._started = True
        await p.start()
        assert p._process is None

    @pytest.mark.asyncio
    async def test_start_raises_on_empty_binary(self):
        p = AgentBrowserProcess(binary="")
        p._binary = ""
        with pytest.raises(FileNotFoundError, match="open-browser-agent not found"):
            await p.start()

    @pytest.mark.asyncio
    async def test_start_spawns_process_and_waits_for_ready(self):
        mock_proc = AsyncMock()
        mock_proc.returncode = None
        mock_proc.stdin = AsyncMock()
        mock_proc.stdout = AsyncMock()
        mock_proc.stderr = AsyncMock()
        mock_proc.stdout.readline = AsyncMock(return_value=b'{"jsonrpc":"2.0","id":0}\n')

        with patch("asyncio.create_subprocess_exec", return_value=mock_proc) as mock_exec:
            p = AgentBrowserProcess(binary="/usr/bin/test-agent")
            await p.start()
            assert p._started is True
            mock_exec.assert_called_once()

    @pytest.mark.asyncio
    async def test_start_parses_binary_with_args(self):
        mock_proc = AsyncMock()
        mock_proc.returncode = None
        mock_proc.stdin = AsyncMock()
        mock_proc.stdout = AsyncMock()
        mock_proc.stderr = AsyncMock()
        mock_proc.stdout.readline = AsyncMock(return_value=b"ready\n")

        with patch("asyncio.create_subprocess_exec", return_value=mock_proc) as mock_exec:
            p = AgentBrowserProcess(binary="/usr/bin/node /path/to/sidecar.js")
            await p.start()
            args, kwargs = mock_exec.call_args
            assert args[0] == "/usr/bin/node"
            assert "/path/to/sidecar.js" in args

    @pytest.mark.asyncio
    async def test_start_raises_on_process_exit(self):
        mock_proc = AsyncMock()
        mock_proc.returncode = 1
        mock_proc.stdin = AsyncMock()
        mock_proc.stdout = AsyncMock()
        mock_proc.stderr = AsyncMock()
        mock_proc.stderr.read = AsyncMock(return_value=b"some error")
        mock_proc.stdout.readline = AsyncMock(side_effect=asyncio.TimeoutError())

        with patch("asyncio.create_subprocess_exec", return_value=mock_proc):
            p = AgentBrowserProcess(binary="/bin/false")
            with pytest.raises(RuntimeError, match="failed to start"):
                await p.start()

    @pytest.mark.asyncio
    async def test_start_stops_process_on_failure(self):
        mock_proc = AsyncMock()
        mock_proc.returncode = None
        mock_proc.stdin = AsyncMock()
        mock_proc.stdout = AsyncMock()
        mock_proc.stderr = AsyncMock()
        mock_proc.stdout.readline = AsyncMock(side_effect=asyncio.TimeoutError())

        with patch("asyncio.create_subprocess_exec", return_value=mock_proc):
            p = AgentBrowserProcess(binary="/bin/true")
            with pytest.raises(RuntimeError):
                await p.start()
            assert p._started is False


class TestAgentBrowserProcessStop:
    @pytest.mark.asyncio
    async def test_stop_sends_sigterm(self):
        mock_proc = AsyncMock()
        mock_proc.returncode = None
        mock_proc.wait = AsyncMock(return_value=0)
        p = AgentBrowserProcess()
        p._process = mock_proc
        p._started = True
        await p.stop()
        mock_proc.send_signal.assert_called_once_with(signal.SIGTERM)
        assert p._started is False
        assert p._process is None

    @pytest.mark.asyncio
    async def test_stop_kills_on_timeout(self):
        mock_proc = MagicMock()
        mock_proc.returncode = None
        mock_proc.send_signal = MagicMock()
        mock_proc.kill = MagicMock()
        mock_proc.wait = AsyncMock(side_effect=[TimeoutError, None])
        p = AgentBrowserProcess()
        p._process = mock_proc
        p._started = True
        await p.stop()
        mock_proc.kill.assert_called_once()

    @pytest.mark.asyncio
    async def test_stop_noop_when_no_process(self):
        p = AgentBrowserProcess()
        await p.stop()
        assert p._process is None


class TestAgentBrowserProcessStdio:
    def test_stdin_returns_none_when_no_process(self):
        p = AgentBrowserProcess()
        assert p.stdin is None

    def test_stdout_returns_none_when_no_process(self):
        p = AgentBrowserProcess()
        assert p.stdout is None

    def test_stdin_returns_process_stdin(self):
        p = AgentBrowserProcess()
        mock_proc = MagicMock()
        mock_proc.stdin = "stdin_obj"
        p._process = mock_proc
        assert p.stdin == "stdin_obj"

    def test_stdout_returns_process_stdout(self):
        p = AgentBrowserProcess()
        mock_proc = MagicMock()
        mock_proc.stdout = "stdout_obj"
        p._process = mock_proc
        assert p.stdout == "stdout_obj"


class TestAgentBrowserProcessBuildFromSource:
    @pytest.mark.asyncio
    async def test_returns_false_when_source_missing(self):
        with patch("sediman.agentbrowser.process._SOURCE_DIR") as mock_dir:
            mock_dir.exists.return_value = False
            result = await AgentBrowserProcess.build_from_source()
            assert result is False

    @pytest.mark.asyncio
    async def test_returns_false_when_package_json_missing(self):
        with patch("sediman.agentbrowser.process._SOURCE_DIR") as mock_dir:
            mock_dir.exists.return_value = True
            mock_dir.__truediv__ = lambda s, o: MagicMock(exists=MagicMock(return_value=False))
            result = await AgentBrowserProcess.build_from_source()
            assert result is False
