import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Database } from "bun:sqlite";
import type { LLMProvider, ToolCall } from "../../src/llm/provider";

export function tmpSedimanDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "sediman-test-"));
  return {
    dir,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export function tmpDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA foreign_keys=ON");
  return db;
}

export function makeLLM(overrides: Record<string, unknown> = {}) {
  const chat = overrides.chat as typeof defaultChat ?? defaultChat;
  const chatStream = overrides.chatStream ?? defaultChatStream;
  const chatStreamWithTools = overrides.chatStreamWithTools ?? defaultChatStreamWithTools;
  return { chat, chatStream, chatStreamWithTools };
}

const defaultChat = async () => ({
  text: "test response",
  tool_calls: [],
  done: true,
});

async function* defaultChatStream() {
  yield "test";
}

const defaultChatStreamWithTools = async () => ({
  text: "test",
  tool_calls: [],
  done: true,
});

export function makeBrowser() {
  return {
    navigate: async () => ({ url: "https://example.com", title: "Example", content: "ok", success: true }),
    click: async () => ({ success: true }),
    type: async () => ({ success: true }),
    screenshot: async () => ({ data: "", success: true }),
    close: async () => {},
  };
}

export function makeToolBus() {
  const { ToolBus } = require("../../src/agent/tools/bus");
  const bus = new ToolBus();
  bus.register(
    { name: "echo", description: "Echo tool", parameters: { type: "object", properties: { text: { type: "string" } } } },
    async (_name: string, args: Record<string, unknown>) => ({ success: true, output: String(args.text ?? "") }),
  );
  return bus;
}

export function writeConfig(dir: string) {
  writeFileSync(join(dir, "auth.json"), "{}\n");
  return dir;
}

/**
 * Mock LLM Provider for testing
 * Implements the LLMProvider interface with configurable responses
 */
export class MockLLMProvider implements LLMProvider {
  private response: {
    text: string | null;
    tool_calls: ToolCall[];
    done: boolean;
  };

  constructor(response: Partial<{ text: string; tool_calls: ToolCall[]; done: boolean }> = {}) {
    this.response = {
      text: response.text ?? "test response",
      tool_calls: response.tool_calls ?? [],
      done: response.done ?? true,
    };
  }

  setResponse(response: Partial<{ text: string; tool_calls: ToolCall[]; done: boolean }>): void {
    if (response.text !== undefined) this.response.text = response.text;
    if (response.tool_calls !== undefined) this.response.tool_calls = response.tool_calls;
    if (response.done !== undefined) this.response.done = response.done;
  }

  async chat(
    _messages: unknown[],
    _tools: unknown[],
    _systemPrompt?: string
  ): Promise<{ text: string | null; tool_calls: ToolCall[]; done: boolean }> {
    return { ...this.response };
  }

  async chatStream(
    _messages: unknown[],
    _tools: unknown[],
    _systemPrompt?: string,
    _onChunk?: (chunk: string) => void
  ): Promise<{ text: string | null; tool_calls: ToolCall[]; done: boolean }> {
    if (_onChunk && this.response.text) {
      _onChunk(this.response.text);
    }
    return { ...this.response };
  }

  async chatStreamWithTools(
    _messages: unknown[],
    _tools: unknown[],
    _systemPrompt?: string,
    _onChunk?: (chunk: string) => void
  ): Promise<{ text: string | null; tool_calls: ToolCall[]; done: boolean }> {
    if (_onChunk && this.response.text) {
      _onChunk(this.response.text);
    }
    return { ...this.response };
  }
}
