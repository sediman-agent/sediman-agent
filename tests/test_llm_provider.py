from __future__ import annotations

from unittest.mock import patch

import pytest

from sediman.llm.provider import (
    LLMResponse,
    ToolCall,
    ToolDefinition,
    create_provider,
    PROVIDERS,
    PROVIDER_CATEGORIES,
    list_providers,
)


class TestLLMResponse:
    def test_has_tool_calls_true(self):
        resp = LLMResponse(tool_calls=[ToolCall(id="1", name="f", arguments={})])
        assert resp.has_tool_calls is True

    def test_has_tool_calls_false(self):
        resp = LLMResponse(text="hello")
        assert resp.has_tool_calls is False

    def test_done_default_false(self):
        resp = LLMResponse(text="done")
        assert resp.done is False

    def test_done_set_explicitly(self):
        resp = LLMResponse(text="done", done=True)
        assert resp.done is True

    def test_done_false_when_tool_calls(self):
        resp = LLMResponse(
            text="",
            tool_calls=[ToolCall(id="1", name="f", arguments={})],
        )
        assert resp.done is False

    def test_default_values(self):
        resp = LLMResponse()
        assert resp.text is None
        assert resp.tool_calls == []
        assert resp.done is False


class TestToolCall:
    def test_attributes(self):
        tc = ToolCall(id="abc", name="my_func", arguments={"x": 1})
        assert tc.id == "abc"
        assert tc.name == "my_func"
        assert tc.arguments == {"x": 1}


class TestToolDefinition:
    def test_attributes(self):
        td = ToolDefinition(name="t", description="desc", parameters={"type": "object"})
        assert td.name == "t"


class TestProvidersRegistry:
    def test_has_all_major_providers(self):
        expected = [
            "openai", "anthropic", "gemini", "mistral", "xai", "cohere",
            "glm", "deepseek", "dashscope", "siliconflow", "minimax", "minimax-global",
            "openrouter", "groq", "together", "fireworks", "cerebras", "deepinfra", "perplexity",
            "ollama", "vllm", "sglang", "llamacpp", "lmstudio",
        ]
        for name in expected:
            assert name in PROVIDERS, f"Missing provider: {name}"

    def test_all_cloud_providers_have_api_key_env(self):
        for name, preset in PROVIDERS.items():
            if preset.get("category") in ("cloud", "cloud-cn", "inference"):
                assert preset.get("api_key_env"), f"{name} missing api_key_env"

    def test_local_providers_have_no_api_key(self):
        local = ["ollama", "vllm", "sglang", "llamacpp", "lmstudio"]
        for name in local:
            assert PROVIDERS[name].get("api_key_env") is None, f"{name} should have no api_key_env"

    def test_all_providers_have_model(self):
        for name, preset in PROVIDERS.items():
            assert preset.get("model"), f"{name} missing model"

    def test_all_providers_have_category(self):
        for name, preset in PROVIDERS.items():
            assert preset.get("category"), f"{name} missing category"

    def test_minimax_and_global_different_base_url(self):
        assert PROVIDERS["minimax"]["base_url"] != PROVIDERS["minimax-global"]["base_url"]

    def test_provider_categories_defined(self):
        assert "cloud" in PROVIDER_CATEGORIES
        assert "cloud-cn" in PROVIDER_CATEGORIES
        assert "inference" in PROVIDER_CATEGORIES
        assert "local" in PROVIDER_CATEGORIES


class TestCreateProvider:
    def test_creates_openai_provider(self):
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            provider = create_provider("openai")
        assert provider.model == "gpt-4o"

    def test_creates_ollama_provider(self):
        provider = create_provider("ollama")
        assert provider.model == "qwen3"
        assert provider.base_url == "http://localhost:11434/v1"

    def test_creates_deepseek_provider(self):
        with patch.dict("os.environ", {"DEEPSEEK_API_KEY": "dsk-test"}):
            provider = create_provider("deepseek")
        assert provider.model == "deepseek-chat"
        assert "deepseek" in (provider.base_url or "")

    def test_creates_glm_provider(self):
        with patch.dict("os.environ", {"GLM_API_KEY": "glm-test"}):
            provider = create_provider("glm")
        assert provider.model == "glm-4-flash"
        assert "bigmodel" in (provider.base_url or "")

    def test_creates_vllm_provider(self):
        provider = create_provider("vllm")
        assert provider.model == "auto"
        assert "8000" in (provider.base_url or "")

    def test_creates_sglang_provider(self):
        provider = create_provider("sglang")
        assert provider.model == "auto"
        assert "30000" in (provider.base_url or "")

    def test_creates_openrouter_provider(self):
        with patch.dict("os.environ", {"OPENROUTER_API_KEY": "or-test"}):
            provider = create_provider("openrouter")
        assert "openrouter" in (provider.base_url or "")

    def test_creates_groq_provider(self):
        with patch.dict("os.environ", {"GROQ_API_KEY": "gq-test"}):
            provider = create_provider("groq")
        assert "groq" in (provider.base_url or "")

    def test_custom_model_overrides_default(self):
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            provider = create_provider("openai", model="gpt-3.5-turbo")
        assert provider.model == "gpt-3.5-turbo"

    def test_custom_base_url_overrides_default(self):
        provider = create_provider("ollama", base_url="http://custom:1234/v1")
        assert provider.base_url == "http://custom:1234/v1"

    def test_unknown_provider_raises(self):
        with pytest.raises(ValueError, match="Unknown provider"):
            create_provider("nonexistent")

    def test_auth_store_key_used(self):
        with patch("sediman.auth.get_key", return_value="auth-store-key"):
            provider = create_provider("openai")
        assert provider.api_key == "auth-store-key"


class TestListProviders:
    def test_returns_all_providers(self):
        providers = list_providers()
        assert len(providers) == len(PROVIDERS)
        names = {p["name"] for p in providers}
        assert "openai" in names
        assert "ollama" in names
        assert "deepseek" in names

    def test_provider_info_structure(self):
        providers = list_providers()
        for p in providers:
            assert "name" in p
            assert "default_model" in p
            assert "category" in p
            assert "needs_api_key" in p
            assert "has_key" in p
