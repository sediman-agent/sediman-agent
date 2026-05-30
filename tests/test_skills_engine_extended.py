from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sediman.skills.engine import SkillEngine


@pytest.fixture
def engine(tmp_sediman_dir: Path):
    skills_dir = tmp_sediman_dir / "skills"
    with patch("sediman.skills.engine.GLOBAL_SKILLS_DIR", skills_dir):
        yield SkillEngine(skills_dir=skills_dir)


class TestFindSimilar:
    @pytest.mark.asyncio
    async def test_returns_empty_when_no_skills(self, engine):
        with patch("sediman.skills.search.SkillSearchEngine") as MockSearch:
            mock_search = MagicMock()
            mock_search.search = AsyncMock(return_value=[])
            mock_search.ensure_loaded = AsyncMock(return_value=None)
            MockSearch.return_value = mock_search
            result = await engine.find_similar("test description")
            assert result == []

    @pytest.mark.asyncio
    async def test_finds_exact_name_match(self, engine):
        engine.create(name="exact-skill", description="does something", steps=["a"])
        with patch("sediman.skills.search.SkillSearchEngine") as MockSearch:
            from sediman.skills.search import SkillSearchResult
            mock_search = MagicMock()
            mock_search.search = AsyncMock(return_value=[
                SkillSearchResult(
                    name="exact-skill",
                    description="does something",
                    score=0.95,
                    scope="internal",
                    source="local",
                    path="",
                )
            ])
            mock_search.ensure_loaded = AsyncMock(return_value=None)
            MockSearch.return_value = mock_search
            result = await engine.find_similar("exact-skill does something")
            assert result is not None
            assert result[0]["name"] == "exact-skill"

    @pytest.mark.asyncio
    async def test_falls_back_to_keyword_on_search_error(self, engine):
        engine.create(name="fallback-test", description="cooking pasta carbonara", steps=["a"])

        with patch("sediman.skills.search.SkillSearchEngine") as MockSearch:
            MockSearch.return_value.search = AsyncMock(side_effect=RuntimeError("broken"))

            result = await engine.find_similar("quantum physics experiments")
            # No keyword overlap with "cooking pasta carbonara", so empty
            assert result == []

    @pytest.mark.asyncio
    async def test_keyword_fallback_finds_match(self, engine):
        engine.create(
            name="cooking-skill",
            description="A skill about cooking pasta carbonara",
            steps=["a"],
        )

        with patch("sediman.skills.search.SkillSearchEngine") as MockSearch:
            MockSearch.return_value.search = AsyncMock(side_effect=RuntimeError("broken"))

            result = await engine.find_similar("cooking pasta")
            assert result is not None
            assert len(result) > 0
            assert result[0]["name"] == "cooking-skill"

    @pytest.mark.asyncio
    async def test_respects_limit(self, engine):
        engine.create(name="skill-a", description="about cooking food", steps=["a"])
        engine.create(name="skill-b", description="about baking food", steps=["b"])
        engine.create(name="skill-c", description="about grilling food", steps=["c"])

        with patch("sediman.skills.search.SkillSearchEngine") as MockSearch:
            MockSearch.return_value.search = AsyncMock(side_effect=RuntimeError("broken"))

            result = await engine.find_similar("food cooking", limit=2)
            assert len(result) <= 2


class TestVerifyAndRollback:
    @pytest.mark.asyncio
    async def test_returns_none_for_missing_skill(self, engine):
        with patch("sediman.skills.healer.verify_skill") as mock_verify:
            mock_verify.return_value = {"passed": True, "fail_reason": ""}
            result = await engine.verify_and_rollback("nonexistent", "verify prompt", llm=MagicMock())
            assert result is None

    @pytest.mark.asyncio
    async def test_verify_passed_returns_skill(self, engine):
        engine.create(name="test-skill", description="desc", steps=["a"], verification="check x")

        with patch("sediman.skills.healer.verify_skill") as mock_verify:
            mock_verify.return_value = {"passed": True, "fail_reason": ""}
            result = await engine.verify_and_rollback("test-skill", "verify prompt", llm=MagicMock())
            assert result is not None
            assert result["name"] == "test-skill"

    @pytest.mark.asyncio
    async def test_verify_failed_rolls_back(self, engine):
        engine.create(name="rollback-skill", description="v1", steps=["step 1"], verification="check 1")
        engine.patch("rollback-skill", {"description": "v2", "steps": ["step 2"]})

        with patch("sediman.skills.healer.verify_skill") as mock_verify:
            mock_verify.return_value = {"passed": False, "fail_reason": "broken"}
            result = await engine.verify_and_rollback("rollback-skill", "verify prompt", llm=MagicMock())

        assert result is not None
        assert result["description"] == "v1"
        assert result["steps"] == ["step 1"]

    @pytest.mark.asyncio
    async def test_verify_failed_no_history_returns_none(self, engine):
        engine.create(name="new-skill", description="v1", steps=["step 1"])

        with patch("sediman.skills.healer.verify_skill") as mock_verify:
            mock_verify.return_value = {"passed": False, "fail_reason": "broken"}
            result = await engine.verify_and_rollback("new-skill", "verify prompt", llm=MagicMock())

        assert result is None

    @pytest.mark.asyncio
    async def test_pass_screenshot_to_verify(self, engine):
        engine.create(name="ss-skill", description="desc", steps=["a"])

        with patch("sediman.skills.healer.verify_skill") as mock_verify:
            mock_verify.return_value = {"passed": True, "fail_reason": ""}
            result = await engine.verify_and_rollback(
                "ss-skill",
                "verify prompt",
                llm=MagicMock(),
                screenshot_path="/tmp/test.png",
                dom_snapshot="<html></html>",
            )
            assert result is not None

    @pytest.mark.asyncio
    async def test_verify_failed_keeps_reason(self, engine):
        engine.create(name="fail-skill", description="v1", steps=["a"], verification="x")
        engine.patch("fail-skill", {"steps": ["b"]})

        with patch("sediman.skills.healer.verify_skill") as mock_verify:
            mock_verify.return_value = {"passed": False, "fail_reason": "element not found"}
            result = await engine.verify_and_rollback("fail-skill", "verify prompt", llm=MagicMock())

        assert result is not None
        assert result["description"] == "v1"
