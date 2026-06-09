export class SedimanError extends Error {
  code: string;
  message: string;

  constructor(message = "", code = "UNKNOWN") {
    super(message);
    this.name = "SedimanError";
    this.code = code;
    this.message = message;
  }
}

export class ToolError extends SedimanError {
  constructor(message = "", code = "TOOL_ERROR") {
    super(message, code);
    this.name = "ToolError";
  }
}

export class TerminalError extends ToolError {
  command: string;

  constructor(message = "", command = "", code = "TERMINAL_ERROR") {
    super(message, code);
    this.name = "TerminalError";
    this.command = command;
  }
}

export class BrowserError extends SedimanError {
  constructor(message = "", code = "BROWSER_ERROR") {
    super(message, code);
    this.name = "BrowserError";
  }
}

export class LLMError extends SedimanError {
  constructor(message = "", code = "LLM_ERROR") {
    super(message, code);
    this.name = "LLMError";
  }
}

export class AuthError extends LLMError {
  constructor(message = "") {
    super(message, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

export class RateLimitError extends LLMError {
  constructor(message = "") {
    super(message, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

export class SkillError extends SedimanError {
  constructor(message = "", code = "SKILL_ERROR") {
    super(message, code);
    this.name = "SkillError";
  }
}

export class MemoryError extends SedimanError {
  constructor(message = "", code = "MEMORY_ERROR") {
    super(message, code);
    this.name = "MemoryError";
  }
}

export class ConfigError extends SedimanError {
  constructor(message = "") {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}

export interface ErrorInfo {
  code: string;
  message: string;
  suggestion?: string;
}

export function classifyError(exc: unknown): ErrorInfo {
  if (exc instanceof AuthError) {
    return {
      code: "AUTH_ERROR",
      message: exc.message || "Invalid or missing API key.",
      suggestion: "Set your API key: export OPENAI_API_KEY=sk-...",
    };
  }

  if (exc instanceof RateLimitError) {
    return {
      code: "RATE_LIMIT",
      message: exc.message || "Rate limit exceeded.",
      suggestion: "Wait a moment and try again.",
    };
  }

  if (exc instanceof LLMError) {
    return {
      code: "LLM_ERROR",
      message: exc.message || "LLM provider error.",
      suggestion: "Check your provider configuration.",
    };
  }

  if (exc instanceof TerminalError) {
    return {
      code: "TERMINAL_ERROR",
      message: exc.message || "Command execution failed.",
      suggestion: "Check the command and try again.",
    };
  }

  if (exc instanceof BrowserError) {
    return {
      code: "BROWSER_ERROR",
      message: exc.message || "Browser error.",
      suggestion: "Check browser configuration.",
    };
  }

  if (exc instanceof ToolError) {
    return {
      code: "TOOL_ERROR",
      message: exc.message || "Tool execution failed.",
      suggestion: "Try a different approach.",
    };
  }

  if (exc instanceof SkillError) {
    return {
      code: "SKILL_ERROR",
      message: exc.message || "Skill operation failed.",
      suggestion: "Check skill configuration.",
    };
  }

  if (exc instanceof MemoryError) {
    return {
      code: "MEMORY_ERROR",
      message: exc.message || "Memory operation failed.",
      suggestion: "",
    };
  }

  if (exc instanceof ConfigError) {
    return {
      code: "CONFIG_ERROR",
      message: exc.message || "Configuration error.",
      suggestion: "Check your settings.",
    };
  }

  const msg = exc instanceof Error ? exc.message : String(exc);
  const excType = exc instanceof Error ? exc.constructor.name : typeof exc;
  const msgLower = msg.toLowerCase();

  if (
    msgLower.includes("api key") ||
    msgLower.includes("apikey") ||
    msgLower.includes("invalid key") ||
    msgLower.includes("incorrect api key")
  ) {
    return {
      code: "AUTH_ERROR",
      message: msg,
      suggestion: "Set your API key: export OPENAI_API_KEY=sk-...",
    };
  }

  if (
    excType.includes("ConnectionError") ||
    msg.includes("ConnectionRefused") ||
    msgLower.includes("connect")
  ) {
    return {
      code: "CONNECTION_ERROR",
      message: "Cannot connect to the LLM provider.",
      suggestion: "Check your network connection and API base URL.",
    };
  }

  if (
    msgLower.includes("timeout") ||
    msgLower.includes("timed out") ||
    excType.includes("TimeoutError")
  ) {
    return {
      code: "TIMEOUT",
      message: "The request timed out.",
      suggestion: "Try again, or use a simpler task.",
    };
  }

  if (msgLower.includes("rate limit") || excType.includes("RateLimitError")) {
    return {
      code: "RATE_LIMIT",
      message: "Rate limit exceeded.",
      suggestion: "Wait a moment and try again.",
    };
  }

  if (msgLower.includes("not found") && msgLower.includes("browser")) {
    return {
      code: "BROWSER_NOT_FOUND",
      message: "Browser not found.",
      suggestion: "Install Chromium or run with a different browser.",
    };
  }

  if (excType.includes("ModuleNotFoundError")) {
    return {
      code: "MISSING_DEP",
      message: `Missing dependency: ${msg}`,
      suggestion: "Run: npm install",
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: msg.length > 300 ? msg.slice(0, 300) : msg || excType,
  };
}
