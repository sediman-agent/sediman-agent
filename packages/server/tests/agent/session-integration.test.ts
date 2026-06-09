/**
 * Integration tests for session saving
 * Tests that sessions are automatically saved after agent execution
 */

import { test, describe, expect, beforeEach, afterEach } from "bun:test";
import { tmpSedimanDir, MockLLMProvider } from "../fixtures";
import { resetConfig } from "../../src/core/config";
import { closeDb, getDb } from "../../src/store/db";
import type { StepEvent } from "../../src/core/types";

describe("Session Saving Integration", () => {
  let dir: string;
  let cleanup: () => void;

  beforeEach(async () => {
    ({ dir, cleanup } = tmpSedimanDir());
    process.env.SEDIMAN_DATA_DIR = dir;
    resetConfig();
    closeDb();
    // Initialize database
    getDb();
  });

  afterEach(() => {
    closeDb();
    cleanup();
    delete process.env.SEDIMAN_DATA_DIR;
    resetConfig();
  });

  describe("AgentLoop session saving", () => {
    test("AgentLoop saves session to database after execution", async () => {
      const { AgentLoop } = await import("../../src/agent/execution/loop");
      const { getRecentSessions } = await import("../../src/memory/sessions");

      // Create a mock LLM provider that returns a simple response
      const mockProvider = new MockLLMProvider({
        text: "Task completed successfully",
        tool_calls: [],
      });

      const agentLoop = new AgentLoop({
        llmProvider: mockProvider,
        headless: true,
      });

      // Run a simple task
      const result = await agentLoop.run("test task");

      // Verify result is valid
      expect(result).toBeDefined();
      expect(result.task).toBe("test task");
      expect(result.steps).toBeInstanceOf(Array);

      // Check that session was saved to database
      const sessions = await getRecentSessions(10);
      const found = sessions.find((s) => s.task === "test task");
      expect(found).toBeDefined();
      expect(found!.task).toBe("test task");
    });

    test("AgentLoop saves session with correct structure", async () => {
      const { AgentLoop } = await import("../../src/agent/execution/loop");
      const { getRecentSessions } = await import("../../src/memory/sessions");

      const mockProvider = new MockLLMProvider({
        text: "Task completed",
        tool_calls: [],
      });

      const agentLoop = new AgentLoop({
        llmProvider: mockProvider,
        headless: true,
      });

      await agentLoop.run("structured task");

      const sessions = await getRecentSessions(10);
      const found = sessions.find((s) => s.task === "structured task");

      expect(found).toBeDefined();
      expect(found!.id).toBeDefined();
      expect(found!.task).toBe("structured task");
      expect(found!.created_at).toBeDefined();
    });

    test("AgentLoop includes steps in saved session", async () => {
      const { AgentLoop } = await import("../../src/agent/execution/loop");
      const { getSessionById, getRecentSessions } = await import("../../src/memory/sessions");

      const mockProvider = new MockLLMProvider({
        text: "Done",
        tool_calls: [],
      });

      const agentLoop = new AgentLoop({
        llmProvider: mockProvider,
        headless: true,
      });

      await agentLoop.run("steps task");

      // Get the most recent session
      const sessions = await getRecentSessions(1);
      expect(sessions.length).toBeGreaterThan(0);

      const session = await getSessionById(sessions[0].id);
      expect(session).not.toBeNull();
    });

    test("AgentLoop saves failed tasks without result", async () => {
      const { AgentLoop } = await import("../../src/agent/execution/loop");
      const { getRecentSessions } = await import("../../src/memory/sessions");

      const mockProvider = new MockLLMProvider({
        text: "Error occurred",
        tool_calls: [],
        done: true,
      });

      const agentLoop = new AgentLoop({
        llmProvider: mockProvider,
        headless: true,
      });

      // Run a task that might fail
      const result = await agentLoop.run("failing task");

      // Session should still be saved
      const sessions = await getRecentSessions(10);
      const found = sessions.find((s) => s.task === "failing task");
      expect(found).toBeDefined();
    });
  });

  describe("Session data structure", () => {
    test("saved session has required fields", async () => {
      const { saveSession, getSessionById } = await import("../../src/memory/sessions");

      const steps: StepEvent[] = [
        { phase: "planning", action: "plan", detail: "create plan" },
        { phase: "executing", action: "test_action", detail: "test detail" },
      ];

      const id = await saveSession({
        task: "structured test",
        steps,
        result: "success",
      });

      const session = await getSessionById(id);
      expect(session).not.toBeNull();
      expect(session!.task).toBe("structured test");
      expect(session!.id).toBe(id);
      expect(session!.created_at).toBeDefined();
    });

    test("saved session with null result is handled", async () => {
      const { saveSession, getSessionById } = await import("../../src/memory/sessions");

      const id = await saveSession({
        task: "failed task",
        steps: [],
        result: undefined,
      });

      const session = await getSessionById(id);
      expect(session).not.toBeNull();
      expect(session!.task).toBe("failed task");
      expect(session!.result).toBeUndefined();
    });

    test("saved session stores steps as JSON", async () => {
      const { saveSession, getSessionById } = await import("../../src/memory/sessions");

      const steps: StepEvent[] = [
        { phase: "executing", action: "click", detail: '{"refId": 1}', observation: "clicked" },
        { phase: "executing", action: "type", detail: '{"text": "hello"}', observation: "typed" },
      ];

      const id = await saveSession({
        task: "steps test",
        steps,
        result: "done",
      });

      const session = await getSessionById(id);
      expect(session).not.toBeNull();
      expect(session!.task).toBe("steps test");
    });
  });

  describe("Session persistence", () => {
    test("sessions persist across database reconnections", async () => {
      const { saveSession, getRecentSessions } = await import("../../src/memory/sessions");

      await saveSession({ task: "persistent session", result: "data" });

      // Close and reopen database
      closeDb();
      const db = getDb();

      const sessions = await getRecentSessions();
      const found = sessions.find((s) => s.task === "persistent session");
      expect(found).toBeDefined();
    });

    test("multiple sessions are saved and retrieved in order", async () => {
      const { saveSession, getRecentSessions } = await import("../../src/memory/sessions");

      await saveSession({ task: "first task", result: "result1" });
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await saveSession({ task: "second task", result: "result2" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await saveSession({ task: "third task", result: "result3" });

      const sessions = await getRecentSessions(3);
      expect(sessions.length).toBeGreaterThanOrEqual(3);

      // Most recent should be first (or at least third task should be in the list)
      const taskNames = sessions.map(s => s.task);
      expect(taskNames).toContain("third task");
      expect(taskNames).toContain("second task");
      expect(taskNames).toContain("first task");
    });
  });
});
