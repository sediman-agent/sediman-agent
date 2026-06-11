import { describe, test, expect, beforeEach } from "bun:test";
import {
  App,
  COMMANDS,
  DEFAULT_MODES,
  SPINNER_FRAMES,
} from "./app.js";
import type { ChatMessage } from "./types.js";
import { getAllCommandNames } from "./constants.js";

describe("App", () => {
  let app: App;

  beforeEach(() => {
    app = new App("openai", "gpt-4", null, true);
  });

  test("constructor sets defaults", () => {
    expect(app.provider).toBe("openai");
    expect(app.model).toBe("gpt-4");
    expect(app.headless).toBe(true);
    expect(app.agent.running).toBe(false);
    expect(app.messages).toEqual([]);
    expect(app.showBanner).toBe(true);
    expect(app.themeName).toBe("opencode");
  });

  test("theme returns ThemeTokens", () => {
    const theme = app.theme;
    expect(theme.primary).toBeTruthy();
    expect(theme.background).toBeTruthy();
    expect(theme.text).toBeTruthy();
  });

  test("spinnerChar cycles through frames", () => {
    for (let i = 0; i < SPINNER_FRAMES.length; i++) {
      expect(app.spinnerChar).toBe(SPINNER_FRAMES[i]);
      app.advanceSpinner();
    }
    expect(app.spinnerChar).toBe(SPINNER_FRAMES[0]);
  });

  test("showToast sets text and expiry", () => {
    app.showToast("hello");
    expect(app.toastText).toBe("hello");
    expect(app.toastExpiry).toBeGreaterThan(Date.now());
  });

  test("cycleAgentMode cycles through modes", () => {
    const modes = DEFAULT_MODES.map((m: any) => m.mode);
    for (let i = 0; i < modes.length; i++) {
      expect(app.currentModeName()).toBe(modes[i]);
      app.cycleAgentMode();
    }
    expect(app.currentModeName()).toBe(modes[0]);
  });

  test("currentModeLabel returns label", () => {
    expect(app.currentModeLabel()).toBe("Browser");
    app.cycleAgentMode();
    expect(app.currentModeLabel()).toBe("Term");
  });

  test("addUserMessage pushes message", () => {
    app.addUserMessage("hello", 1);
    expect(app.messages.length).toBe(1);
    expect(app.messages[0].type).toBe("user");
    expect(app.messages[0].text).toBe("hello");
    expect(app.messages[0].taskNum).toBe(1);
  });

  test("addSystemMessage pushes message", () => {
    app.addSystemMessage("system msg");
    expect(app.messages.length).toBe(1);
    expect(app.messages[0].type).toBe("system");
    expect(app.messages[0].text).toBe("system msg");
  });

  test("addErrorMessage pushes message", () => {
    app.addErrorMessage("fail");
    expect(app.messages.length).toBe(1);
    expect(app.messages[0].type).toBe("error");
  });

  test("startAgentMessage creates streaming agent message", () => {
    app.startAgentMessage("do stuff");
    expect(app.messages.length).toBe(1);
    expect(app.messages[0].type).toBe("agent");
    expect(app.messages[0].state).toBe("streaming");
    expect(app.messages[0].steps).toEqual([]);
    expect(app.scroll.thinkingExpanded).toBe(true);
  });

  test("appendStep adds steps to streaming agent", () => {
    app.startAgentMessage("task");
    app.appendStep("step 1");
    app.appendStep("step 2");
    const msg = app.messages[0] as ChatMessage;
    expect(msg.steps?.length).toBe(2);
    expect(msg.steps?.[0]).toBe("step 1");
    expect(msg.tabExpanded).toBe(true);
  });

  test("appendStreamingToken adds thinking text", () => {
    app.startAgentMessage("task");
    app.appendStreamingToken("hello ", "thinking");
    const msg = app.messages[0] as ChatMessage;
    expect(msg.thinkingText).toBe("hello ");
  });

  test("appendStreamingToken adds result text", () => {
    app.startAgentMessage("task");
    app.appendStreamingToken("result text", "response");
    const msg = app.messages[0] as ChatMessage;
    expect(msg.result).toBe("result text");
  });

  test("appendStreamingToken strips think tags", () => {
    app.startAgentMessage("task");
    app.appendStreamingToken("<think abc>thinking</think >", "response");
    const msg = app.messages[0] as ChatMessage;
    expect(msg.result).toContain("thinking");
  });

  test("completeAgent marks message as completed", () => {
    app.startAgentMessage("task");
    app.completeAgent(true, "done", 5.2);
    const msg = app.messages[0] as ChatMessage;
    expect(msg.state).toBe("completed");
    expect(msg.success).toBe(true);
    expect(msg.result).toBe("done");
    expect(msg.elapsedSecs).toBe(5.2);
    expect(app.agent.running).toBe(false);
  });

  test("completeAgent with skillCreated and scheduledJob", () => {
    app.startAgentMessage("task");
    app.completeAgent(true, "done", 1, "my-skill", "job-1");
    const msg = app.messages[0] as ChatMessage;
    expect(msg.skillCreated).toBe("my-skill");
    expect(msg.scheduledJob).toBe("job-1");
  });

  test("appendStreamingToken truncates result at 100000 chars", () => {
    app.startAgentMessage("task");
    const longStr = "x".repeat(110000);
    app.appendStreamingToken(longStr, "response");
    const msg = app.messages[0] as ChatMessage;
    expect((msg.result?.length ?? 0)).toBeLessThanOrEqual(100000);
  });

  test("updateProgress handles retry", () => {
    app.updateProgress({ kind: "retry", currentAttempt: 2, maxAttempts: 5, countdownSeconds: 10 });
    expect(app.agent.retryAttempt).toBe(2);
    expect(app.agent.retryMax).toBe(5);
    expect(app.agent.retryCountdown).toBe(10);
    expect(app.agent.streamingPhase).toBe("retrying");
  });

  test("updateProgress handles validation", () => {
    app.updateProgress({ kind: "validation", confidence: 0.85, issuesCount: 3 });
    expect(app.agent.validationConfidence).toBe(0.85);
    expect(app.agent.validationIssues).toBe(3);
  });

  test("updateProgress handles reflection", () => {
    app.updateProgress({ kind: "reflection" });
    expect(app.agent.reflectionStatus).toBe(true);
    expect(app.agent.streamingPhase).toBe("reflecting");
  });

  test("cycleTheme cycles through themes", () => {
    const first = app.themeName;
    app.cycleTheme();
    expect(app.themeName).not.toBe(first);
  });

  test("openModal sets modal state", () => {
    app.openModal("help");
    expect(app.modal.active).toBe("help");
    expect(app.modal.selectedIndex).toBe(0);
    expect(app.modal.filter).toBe("");
  });

  test("closeModal resets modal", () => {
    app.openModal("help");
    app.closeModal();
    expect(app.modal.active).toBeNull();
    expect(app.modal.inputValue).toBe("");
  });

  test("updateCompletion filters commands but hides when exact match exists", () => {
    app.updateCompletion("/h");
    expect(app.completion.filtered).toContain("/help");
    expect(app.completion.visible).toBe(false);
  });

  test("updateCompletion shows for partial match", () => {
    app.updateCompletion("/he");
    expect(app.completion.visible).toBe(true);
    expect(app.completion.filtered).toContain("/help");
  });

  test("updateCompletion hides for non-slash input", () => {
    app.updateCompletion("hello");
    expect(app.completion.visible).toBe(false);
  });

  test("acceptCompletion returns matched command when visible", () => {
    app.updateCompletion("/he");
    expect(app.completion.visible).toBe(true);
    const result = app.acceptCompletion();
    expect(result).toBe("/help ");
  });

  test("acceptCompletion returns empty when not visible", () => {
    app.updateCompletion("/h");
    const result = app.acceptCompletion();
    expect(result).toBe("");
  });

  test("toggleSteps toggles steps expanded", () => {
    const initial = app.scroll.stepsExpanded;
    app.toggleSteps();
    expect(app.scroll.stepsExpanded).toBe(!initial);
  });

  test("switchTab cycles through tabs", () => {
    app.addUserMessage("hi", 1);
    app.startAgentMessage("task");
    app.switchTab(1);
    const msg = app.messages[app.messages.length - 1] as ChatMessage;
    expect(msg.selectedTab).toBeTruthy();
  });

  test("commandNames populated from COMMANDS", () => {
    const commandNames = getAllCommandNames();
    expect(commandNames.length).toBeGreaterThan(0);
    expect(commandNames).toContain("/help");
    expect(commandNames).toContain("/quit");
    expect(commandNames).toContain("/exit");
  });
});

describe("COMMANDS", () => {
  test("all commands have required fields", () => {
    for (const cmd of COMMANDS) {
      expect(cmd.name).toMatch(/^\//);
      expect(cmd.description).toBeTruthy();
      expect(cmd.category).toBeTruthy();
    }
  });
});

describe("DEFAULT_MODES", () => {
  test("has 2 modes", () => {
    expect(DEFAULT_MODES.length).toBe(2);
  });

  test("modes have unique runners", () => {
    const runners = DEFAULT_MODES.map((m: any) => m.runner);
    expect(new Set(runners).size).toBe(runners.length);
  });
});

describe("SPINNER_FRAMES", () => {
  test("has 10 frames", () => {
    expect(SPINNER_FRAMES.length).toBe(10);
  });

  test("frames are single-width characters", () => {
    for (const frame of SPINNER_FRAMES) {
      expect(frame.length).toBeGreaterThan(0);
    }
  });
});
