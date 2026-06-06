import { getConfig } from "./core/config";
import { setupLogging, createLogger } from "./core/logging";
import { initSentry } from "./core/sentry";
import { initDb, closeDb } from "./store/db";
import { createRPCServer } from "./rpc";
import { startApiServer } from "./api";
import { createProvider } from "./llm/provider";
import { FileMemoryStrategy } from "./memory/strategies/file-memory";
import { SkillEngine } from "./skills/engine";
import { HubClient } from "./skills/hub";
import { GitHubInstaller } from "./skills/hub";
import { SkillSearchEngine } from "./skills/search";
import { CronManager } from "./scheduler/cron";
import { AgentLoop } from "./agent/loop";
import { CheckpointManager } from "./agent/checkpoint";
import { Changelog } from "./memory/utils/changelog";
import { RecordingManager } from "./agent/recording/manager";
import { BrowserSession } from "./browser/session";
import { BrowserController } from "./browser/controller";
import { createAgentToolRegistry } from "./agent/tools";
import { cleanupBrowserTools } from "./agent/tools/browser-tools";
import { sandboxSessionManager } from "./sandbox/SessionManager";
import type { RPCHandlerDeps } from "./rpc/deps";

function parseMode(argv: string[]): "rpc" | "api" | "all" {
  const idx = argv.indexOf("--mode");
  if (idx !== -1 && idx + 1 < argv.length) {
    const mode = argv[idx + 1];
    if (mode === "rpc" || mode === "api") return mode;
  }
  return "all";
}

async function main() {
  const mode = parseMode(process.argv);

  setupLogging();
  initSentry();

  const logger = createLogger("server");
  const config = getConfig();

  initDb();

  const providerName = process.env.SEDIMAN_PROVIDER ?? "openai";
  const modelName = process.env.SEDIMAN_MODEL;
  const baseUrl = process.env.SEDIMAN_BASE_URL;
  const apiKey = process.env.SEDIMAN_API_KEY;

  const llmProvider = createProvider(providerName, modelName, baseUrl, apiKey);

  const memory = new FileMemoryStrategy();
  await memory.initialize();

  const skillEngine = new SkillEngine();
  const hubClient = new HubClient();
  const gitHubInstaller = new GitHubInstaller(config.skillsDir);
  const skillSearch = new SkillSearchEngine(skillEngine);
  const cronManager = new CronManager();
  const changelog = new Changelog();
  const checkpointManager = new CheckpointManager();
  const recordingManager = new RecordingManager();

  const headless = (process.env.SEDIMAN_HEADLESS ?? "true") === "true";
  const browserSession = new BrowserSession({
    headless,
    stealth: config.stealthEnabled,
    proxy: config.stealthProxy || undefined,
    userDataDir: config.browserProfileDir,
  });

  const browserController = new BrowserController(browserSession);

  // Create tool registry with browser tools enabled
  const toolRegistry = createAgentToolRegistry({
    terminalAllowed: false,
    memoryManager: memory,
    skillEngine,
    enableBrowserTools: true,
  });

  const agentLoop = new AgentLoop({
    llmProvider,
    browserSession,
    memory,
    skillEngine,
    toolBus: toolRegistry,
    headless,
  });

  const rpcDeps: RPCHandlerDeps = {
    llmProvider,
    browserSession,
    browserController,
    memory,
    skillEngine,
    agentLoop,
    checkpointManager,
    cronManager,
    hubClient,
    gitHubInstaller,
    skillSearch,
    changelog,
    tasksCompleted: 0,
    terminalAllowed: false,
    headless,
    sandboxMode: process.env.SEDIMAN_SANDBOX ?? "off",
    activeRecording: null,
  };

  const apiDeps = {
    llmProvider,
    browserSession,
    memory,
    skillEngine,
    cronManager,
    recordingManager,
    agentLoop,
  };

  const servers: { stop: () => Promise<void> }[] = [];

  if (mode === "rpc" || mode === "all") {
    const rpcServer = createRPCServer(rpcDeps);
    const rpcSocket = process.env.SEDIMAN_RPC_SOCKET ?? "/tmp/sediman.sock";
    await rpcServer.listen(rpcSocket);
    servers.push(rpcServer);
    logger.info({ mode: "rpc", socket: rpcSocket }, "server_started");
  }

  if (mode === "api" || mode === "all") {
    const apiServer = startApiServer({ deps: apiDeps, rpcDeps });
    servers.push({ stop: async () => apiServer.stop() });
    logger.info({ mode: "api" }, "server_started");
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting_down");
    for (const s of servers) {
      try {
        await s.stop();
      } catch (err) {
        logger.error({ err: (err as Error).message }, "server_stop_error");
      }
    }

    // Cleanup browser tools and close all browser instances
    try {
      await cleanupBrowserTools();
    } catch (err) {
      logger.error({ err: (err as Error)?.message }, "browser_cleanup_error");
    }

    closeDb();
    logger.info("shutdown_complete");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  logger.info({ mode }, "sediman_server_ready");
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});

export * from "./core/types";
export * from "./core/errors";
export { getConfig } from "./core/config";
export type { Config } from "./core/config";
export * from "./core/auth";
export * from "./core/utils";
export * from "./core/logging";
export * from "./core/sentry";
export { getDb, initDb, closeDb } from "./store/db";
export * from "./sandbox/SessionManager";
export { sandboxSessionManager } from "./sandbox/SessionManager";
