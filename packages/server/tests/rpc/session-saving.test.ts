/**
 * Tests for RPC agent handler session saving
 * Tests that RPC handlers properly save sessions after agent execution
 */

import { test, describe, expect, beforeEach, afterEach } from "bun:test";
import { tmpSedimanDir, MockLLMProvider, makeToolBus } from "../fixtures";
import { resetConfig } from "../../src/core/config";
import { closeDb, getDb } from "../../src/store/db";

describe("RPC Agent Handler Session Saving", () => {
  let dir: string;
  let cleanup: () => void;

  beforeEach(async () => {
    ({ dir, cleanup } = tmpSedimanDir();
    process.env.SEDIMAN_DATA_DIR = dir;
    resetConfig();
    closeDb();
    getDb();
  });

  afterEach(() => {
    closeDb();
    cleanup();
    delete process.env.SEDIMAN_DATA_DIR;
    resetConfig();
  });

  describe("agent.run RPC handler", () => {
    test("saves session after successful execution", async () => {
      const { getRecentSessions } = await import("../../src/memory/sessions");
      const { BrowserAgent } = await import("../../src/agent/BrowserAgent");
      const { ToolBus } = await import("../../src/agent/tools/bus");

      const mockProvider = new MockLLMProvider({
        text: "Task completed",
        tool_calls: [],
      });

      const toolBus = makeToolBus();

      const agent = new BrowserAgent({
        llmProvider: mockProvider,
        toolBus,
        headless: true,
        enableBrowserTools: false,
        enableShellTools: false,
        enableFileTools: false,
        enableCodingTools: false,
        enableWebTools: false,
        enableSkillsTools: false,
      });

      const result = await agent.run("test rpc task");

      expect(result).toBeDefined();
      expect(result.task).toBe("test rpc task");

      // Verify session was saved
      const sessions = await getRecentSessions(10);
      const found = sessions.find((s) => s.task === "test rpc task");
      expect(found).toBeDefined();
    });

    test("saves session even when task fails", async () => {
      const { getRecentSessions } = await import("../../src/memory/sessions");
      const { BrowserAgent } = await import("../../src/agent/BrowserAgent");

      const mockProvider = new MockLLMProvider({
        text: "Task failed",
        tool_calls: [],
      });

      const toolBus = makeToolBus();

      const agent = new BrowserAgent({
        llmProvider: mockProvider,
        toolBus,
        headless: true,
        enableBrowserTools: false,
        enableShellTools: false,
        enableFileTools: false,
        enableCodingTools: false,
        enableWebTools: false,
        enableSkillsTools: false,
      });

      const result = await agent.run("failing rpc task");

      // Session should still be saved
      const sessions = await getRecentSessions(10);
      const found = sessions.find((s) => s.task === "failing rpc task");
      expect(found).toBeDefined();
    });
  });

  describe("Session data integrity", () => {
    test("session includes steps from agent execution", async () => {
      const { getSessionById, getRecentSessions } = await import("../../src/memory/sessions");
      const { BrowserAgent } = await import("../../src/agent/BrowserAgent");

      const mockProvider = new MockLLMProvider({
        text: "Done with steps",
        tool_calls: [],
      });

      const toolBus = makeToolBus();

      const agent = new BrowserAgent({
        llmProvider: mockProvider,
        toolBus,
        headless: true,
        enableBrowserTools: false,
        enableShellTools: false,
        enableFileTools: false,
        enableCodingTools: false,
        enableWebTools: false,
        enableSkillsTools: false,
      });

      await agent.run("task with steps");

      const sessions = await getRecentSessions(1);
      expect(sessions.length).toBeGreaterThan(0);

      const session = await getSessionById(sessions[0].id);
      expect(session).not.toBeNull();
      expect(session!.task).toBe("task with steps");
    });

    test("session includes result for successful tasks", async () => {
      const { getRecentSessions } = await import("../../src/memory/sessions");
      const { BrowserAgent } = await import("../../src/agent/BrowserAgent");

      const mockProvider = new MockLLMProvider({
        text: "Success result",
        tool_calls: [],
      });

      const toolBus = makeToolBus();

      const agent = new BrowserAgent({
        llmProvider: mockProvider,
        toolBus,
        headless: true,
        enableBrowserTools: false,
        enableShellTools: false,
        enableFileTools: false,
        enableCodingTools: false,
        enableWebTools: false,
        enableSkillsTools: false,
      });

      await agent.run("successful task");

      const sessions = await getRecentSessions(10);
      const found = sessions.find((s) => s.task === "successful task");
      expect(found).toBeDefined();
      expect(found!.result).toBeDefined();
    });
  });
});
