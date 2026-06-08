import type { RPCServer, NotifyFn } from "../server.js";
import type { RPCHandlerDeps } from "../deps.js";
import type { StepEvent } from "../../core/types.js";
import { BrowserAgent, createBrowserAgent } from "../../electron/index.js";
import { streamEventToNotification, type AgentStreamEvent } from "../../agent/streaming.js";

export function registerAgentHandlers(
  server: RPCServer,
  deps: RPCHandlerDeps,
): void {
  server.register("agent.run", async (params, notify) => {
    return runStreaming(params, notify, deps, (task, mode) =>
      runAgentTask(task, mode, deps),
    );
  });

  server.register("agent.cancel", async () => {
    // For BrowserAgent, we don't have a cancel mechanism yet
    // This is a placeholder for future implementation
    return { cancelled: true };
  });

  server.register("agent.terminator", async (params, notify) => {
    const task = (params.task as string) ?? "";
    const mode = "browser";

    return runStreaming(params, notify, deps, (task, mode) =>
      runAgentTask(task, mode, deps),
    );
  });

  server.register("agent.dispatch", async (params, notify) => {
    const task = (params.task as string) ?? "";
    const mode = params.mode as string ?? "browser";

    return runStreaming(params, notify, deps, (task, mode) =>
      runAgentTask(task, mode, deps),
    );
  });
}

async function runAgentTask(
  task: string,
  mode: string | undefined,
  deps: RPCHandlerDeps,
  notify?: NotifyFn,
): Promise<import("../../core/types.js").AgentResult> {
  // Create agent with streaming support
  const agent = createAgentWithStreaming(mode ?? "browser", deps, notify);
  return agent.run(task);
}

async function runStreaming(
  params: Record<string, unknown>,
  notify: NotifyFn | undefined,
  deps: RPCHandlerDeps,
  runFn: (task: string, mode?: string) => Promise<import("../../core/types.js").AgentResult>,
): Promise<import("../../core/types.js").AgentResult> {
  const task = (params.task as string) ?? "";
  const mode = params.mode as string | undefined;

  // Notify about task start
  notify?.("chat.progress", { phase: "planning", action: "run_start", detail: task });

  try {
    const result = await runFn(task, mode);

    // Note: Steps are now streamed during execution via the agent's stream emitter
    // The result.steps are kept for backward compatibility and for final summary

    return result;
  } catch (err) {
    // Emit error notification
    notify?.("chat.error", {
      error: err instanceof Error ? err.message : String(err),
      recoverable: false,
    });
    throw err;
  }
}

/**
 * Create an agent instance with streaming support
 */
function createAgentWithStreaming(
  mode: string,
  deps: RPCHandlerDeps,
  notify: NotifyFn | undefined
): BrowserAgent {
  // All modes now use BrowserAgent
  const agent = createBrowserAgent({
    llmProvider: deps.llmProvider,
    browserController: deps.browserController,
    memory: deps.memory,
    skillEngine: deps.skillEngine,
    skillSearch: deps.skillSearch,
    headless: deps.headless,
    workingDirectory: process.cwd(),
    enableBrowserTools: true,
    enableShellTools: deps.terminalAllowed,
    enableFileTools: true,
    enableCodingTools: true,
    enableWebTools: true,
    enableSkillsTools: true,
    useVision: deps.headless !== true,
  });

  // BrowserAgent doesn't have onStreamEvent yet, but we can add it later
  // For now, the streaming is handled internally

  return agent;
}
