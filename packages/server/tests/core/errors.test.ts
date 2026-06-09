import { test, describe, expect } from "bun:test";
import {
  SedimanError,
  ToolError,
  TerminalError,
  BrowserError,
  LLMError,
  AuthError,
  RateLimitError,
  SkillError,
  MemoryError,
  ConfigError,
  classifyError,
} from "../../src/core/errors";

describe("error hierarchy", () => {
  test("SedimanError has code and message", () => {
    const err = new SedimanError("something broke", "TEST_CODE");
    expect(err.message).toBe("something broke");
    expect(err.code).toBe("TEST_CODE");
    expect(err.name).toBe("SedimanError");
  });

  test("ToolError defaults code to TOOL_ERROR", () => {
    const err = new ToolError("tool failed");
    expect(err.code).toBe("TOOL_ERROR");
    expect(err).toBeInstanceOf(SedimanError);
  });

  test("TerminalError stores command", () => {
    const err = new TerminalError("cmd failed", "rm -rf /");
    expect(err.command).toBe("rm -rf /");
    expect(err).toBeInstanceOf(ToolError);
  });

  test("BrowserError is SedimanError", () => {
    const err = new BrowserError("page crashed");
    expect(err.code).toBe("BROWSER_ERROR");
    expect(err).toBeInstanceOf(SedimanError);
  });

  test("LLMError is SedimanError", () => {
    const err = new LLMError("api down");
    expect(err.code).toBe("LLM_ERROR");
  });

  test("AuthError is LLMError with AUTH_ERROR code", () => {
    const err = new AuthError("bad key");
    expect(err.code).toBe("AUTH_ERROR");
    expect(err).toBeInstanceOf(LLMError);
  });

  test("RateLimitError is LLMError with RATE_LIMIT code", () => {
    const err = new RateLimitError("slow down");
    expect(err.code).toBe("RATE_LIMIT");
    expect(err).toBeInstanceOf(LLMError);
  });

  test("SkillError is SedimanError", () => {
    const err = new SkillError("bad skill");
    expect(err.code).toBe("SKILL_ERROR");
  });

  test("MemoryError is SedimanError", () => {
    const err = new MemoryError("mem fail");
    expect(err.code).toBe("MEMORY_ERROR");
  });

  test("ConfigError is SedimanError with CONFIG_ERROR code", () => {
    const err = new ConfigError("bad config");
    expect(err.code).toBe("CONFIG_ERROR");
  });
});

describe("classifyError", () => {
  test("classifies AuthError", () => {
    const info = classifyError(new AuthError("bad key"));
    expect(info.code).toBe("AUTH_ERROR");
    expect(info.suggestion).toContain("OPENAI_API_KEY");
  });

  test("classifies RateLimitError", () => {
    const info = classifyError(new RateLimitError("too many"));
    expect(info.code).toBe("RATE_LIMIT");
  });

  test("classifies LLMError", () => {
    const info = classifyError(new LLMError("provider fail"));
    expect(info.code).toBe("LLM_ERROR");
  });

  test("classifies TerminalError", () => {
    const info = classifyError(new TerminalError("exit 1", "ls"));
    expect(info.code).toBe("TERMINAL_ERROR");
  });

  test("classifies BrowserError", () => {
    const info = classifyError(new BrowserError("crash"));
    expect(info.code).toBe("BROWSER_ERROR");
  });

  test("classifies ToolError", () => {
    const info = classifyError(new ToolError("tool fail"));
    expect(info.code).toBe("TOOL_ERROR");
  });

  test("classifies SkillError", () => {
    const info = classifyError(new SkillError("bad"));
    expect(info.code).toBe("SKILL_ERROR");
  });

  test("classifies MemoryError", () => {
    const info = classifyError(new MemoryError("mem"));
    expect(info.code).toBe("MEMORY_ERROR");
  });

  test("classifies ConfigError", () => {
    const info = classifyError(new ConfigError("cfg"));
    expect(info.code).toBe("CONFIG_ERROR");
  });

  test("classifies unknown errors as INTERNAL_ERROR", () => {
    const info = classifyError("some random string");
    expect(info.code).toBe("INTERNAL_ERROR");
  });

  test("detects api key errors from plain Error", () => {
    const info = classifyError(new Error("invalid api key provided"));
    expect(info.code).toBe("AUTH_ERROR");
  });

  test("detects connection errors", () => {
    const info = classifyError(new Error("ConnectionRefused: localhost"));
    expect(info.code).toBe("CONNECTION_ERROR");
  });

  test("detects timeout errors", () => {
    const info = classifyError(new Error("request timed out"));
    expect(info.code).toBe("TIMEOUT");
  });
});
