from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest

from sediman.agent.delegate import delegate_task, delegate_parallel


class TestDelegateTask:
    @pytest.mark.asyncio
    async def test_returns_result_text(self):
        browser = MagicMock()
        llm = MagicMock()

        with patch("sediman.browser.session.run_browser_task", new_callable=AsyncMock, return_value=("task done", [])):
            result = await delegate_task("search google", browser, llm)

        assert result == "task done"

    @pytest.mark.asyncio
    async def test_returns_error_on_exception(self):
        browser = MagicMock()
        llm = MagicMock()

        with patch("sediman.browser.session.run_browser_task", new_callable=AsyncMock, side_effect=RuntimeError("browser crashed")):
            result = await delegate_task("failing task", browser, llm)

        assert "Subagent failed" in result
        assert "browser crashed" in result

    @pytest.mark.asyncio
    async def test_uses_custom_max_steps(self):
        browser = MagicMock()
        llm = MagicMock()

        with patch("sediman.browser.session.run_browser_task", new_callable=AsyncMock, return_value=("ok", [])) as mock_task:
            await delegate_task("task", browser, llm, max_steps=10)
            mock_task.assert_called_once()
            call_kwargs = mock_task.call_args
            assert call_kwargs[1].get("max_steps") == 10 or call_kwargs.kwargs.get("max_steps") == 10

    @pytest.mark.asyncio
    async def test_returns_empty_string_result(self):
        browser = MagicMock()
        llm = MagicMock()

        with patch("sediman.browser.session.run_browser_task", new_callable=AsyncMock, return_value=("", [])):
            result = await delegate_task("empty task", browser, llm)
        assert result == ""

    @pytest.mark.asyncio
    async def test_returns_result_with_actions(self):
        browser = MagicMock()
        llm = MagicMock()
        actions = [{"type": "click"}, {"type": "type"}]

        with patch("sediman.browser.session.run_browser_task", new_callable=AsyncMock, return_value=("result", actions)):
            result = await delegate_task("task", browser, llm)
        assert result == "result"


def _make_browser_session_mock():
    browser = MagicMock()
    browser.headless = True
    browser.user_data_dir = "/tmp/test-profile"
    return browser


def _patch_browser_session():
    mock_session_cls = MagicMock()
    mock_session_cls.side_effect = lambda **kwargs: MagicMock(
        start=AsyncMock(), stop=AsyncMock(), **kwargs
    )
    return patch("sediman.browser.session.BrowserSession", mock_session_cls)


class TestDelegateParallel:
    @pytest.mark.asyncio
    async def test_returns_results_in_order(self):
        browser = _make_browser_session_mock()
        llm_provider = MagicMock()
        llm_provider.get_browser_use_llm.return_value = MagicMock()

        async def fake_delegate(task, bs, llm, max_steps=30):
            return f"result-{task}"

        with _patch_browser_session() as mock_bs, \
             patch("sediman.agent.delegate.delegate_task", side_effect=fake_delegate):
            results = await delegate_parallel(["a", "b", "c"], browser, llm_provider)

        assert results == ["result-a", "result-b", "result-c"]
        assert mock_bs.call_count == 3

    @pytest.mark.asyncio
    async def test_handles_task_failure_gracefully(self):
        browser = _make_browser_session_mock()
        llm_provider = MagicMock()
        llm_provider.get_browser_use_llm.return_value = MagicMock()

        async def fake_delegate(task, bs, llm, max_steps=30):
            if task == "fail":
                return "Subagent failed: error"
            return f"ok-{task}"

        with _patch_browser_session(), \
             patch("sediman.agent.delegate.delegate_task", side_effect=fake_delegate):
            results = await delegate_parallel(["good", "fail", "also-good"], browser, llm_provider)

        assert results[0] == "ok-good"
        assert "failed" in results[1]
        assert results[2] == "ok-also-good"

    @pytest.mark.asyncio
    async def test_empty_tasks_list(self):
        browser = _make_browser_session_mock()
        llm_provider = MagicMock()

        results = await delegate_parallel([], browser, llm_provider)

        assert results == []

    @pytest.mark.asyncio
    async def test_single_task(self):
        browser = _make_browser_session_mock()
        llm_provider = MagicMock()
        llm_provider.get_browser_use_llm.return_value = MagicMock()

        with _patch_browser_session(), \
             patch("sediman.agent.delegate.delegate_task", new_callable=AsyncMock, return_value="only result"):
            results = await delegate_parallel(["solo"], browser, llm_provider)

        assert results == ["only result"]

    @pytest.mark.asyncio
    async def test_custom_max_concurrent(self):
        browser = _make_browser_session_mock()
        llm_provider = MagicMock()
        llm_provider.get_browser_use_llm.return_value = MagicMock()

        with _patch_browser_session(), \
             patch("sediman.agent.delegate.delegate_task", new_callable=AsyncMock, return_value="r"):
            results = await delegate_parallel(
                ["a", "b"], browser, llm_provider, max_concurrent=1
            )

        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_replaces_none_with_no_result(self):
        browser = _make_browser_session_mock()
        llm_provider = MagicMock()
        llm_provider.get_browser_use_llm.return_value = MagicMock()

        async def fake_delegate(task, bs, llm, max_steps=30):
            if task == "empty":
                return None
            return task

        with _patch_browser_session(), \
             patch("sediman.agent.delegate.delegate_task", side_effect=fake_delegate):
            results = await delegate_parallel(["empty", "normal"], browser, llm_provider)

        assert results[0] == "No result"
        assert results[1] == "normal"

    @pytest.mark.asyncio
    async def test_creates_isolated_session_per_task(self):
        browser = _make_browser_session_mock()
        llm_provider = MagicMock()
        llm_provider.get_browser_use_llm.return_value = MagicMock()

        sessions_received = []

        async def capture_delegate(task, bs, llm, max_steps=30):
            sessions_received.append(bs)
            return f"result-{task}"

        with _patch_browser_session() as mock_bs, \
             patch("sediman.agent.delegate.delegate_task", side_effect=capture_delegate):
            results = await delegate_parallel(["x", "y", "z"], browser, llm_provider)

        assert len(sessions_received) == 3
        assert len(set(id(s) for s in sessions_received)) == 3
        assert mock_bs.call_count == 3
        for s in sessions_received:
            s.start.assert_awaited_once()
            s.stop.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_stops_session_even_on_delegate_failure(self):
        browser = _make_browser_session_mock()
        llm_provider = MagicMock()
        llm_provider.get_browser_use_llm.return_value = MagicMock()

        captured_session = None

        async def failing_delegate(task, bs, llm, max_steps=30):
            nonlocal captured_session
            captured_session = bs
            raise RuntimeError("boom")

        with _patch_browser_session() as mock_bs, \
             patch("sediman.agent.delegate.delegate_task", side_effect=failing_delegate):
            results = await delegate_parallel(["fail"], browser, llm_provider)

        assert captured_session is not None
        captured_session.start.assert_awaited_once()
        captured_session.stop.assert_awaited_once()
        assert "failed" in results[0].lower()

    @pytest.mark.asyncio
    async def test_inherits_headless_config_from_parent(self):
        browser = _make_browser_session_mock()
        browser.headless = False
        llm_provider = MagicMock()
        llm_provider.get_browser_use_llm.return_value = MagicMock()

        with _patch_browser_session() as mock_bs, \
             patch("sediman.agent.delegate.delegate_task", new_callable=AsyncMock, return_value="ok"):
            await delegate_parallel(["t"], browser, llm_provider)

        call_kwargs = mock_bs.call_args
        assert call_kwargs.kwargs.get("headless") is False
