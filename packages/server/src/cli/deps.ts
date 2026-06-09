import { getConfig } from "../core/config";
import { setupLogging, createLogger } from "../core/logging";
import { initSentry } from "../core/sentry";
import { initDb, closeDb } from "../store/db";
import { createProvider, PROVIDERS } from "../llm/provider";
import { getKey } from "../core/auth";
import { FileMemoryStrategy } from "../memory/strategies/file-memory";
import { SkillEngine } from "../skills/engine";
import { HubClient } from "../skills/hub";
import { GitHubInstaller } from "../skills/hub";
import { SkillSearchEngine } from "../skills/search";
import { CronManager } from "../scheduler/cron";
import { AgentLoop } from "../agent/loop";
import { CheckpointManager } from "../agent/memory/checkpoint";
import { Changelog } from "../memory/utils/changelog";
import { RecordingManager } from "../agent/recording/manager";
import { BrowserSession } from "../browser/session";
import { BrowserController } from "../browser/controller";
import { createAgentToolRegistry } from "../agent/tools";
import { setProjectManager } from "../agent/tools/browser-tools";
import { ProjectManager } from "../project/manager";
import { sandboxSessionManager } from "../sandbox/SessionManager";
import type { RPCHandlerDeps } from "../rpc/deps";

export interface ServerDeps {
  llmProvider: ReturnType<typeof createProvider>;
  browserSession: BrowserSession;
  browserController: BrowserController;
  memory: FileMemoryStrategy;
  skillEngine: SkillEngine;
  agentLoop: AgentLoop;
  projectManager: ProjectManager;
  checkpointManager: CheckpointManager;
  cronManager: CronManager;
  hubClient: HubClient;
  gitHubInstaller: GitHubInstaller;
  skillSearch: SkillSearchEngine;
  changelog: Changelog;
  recordingManager: RecordingManager;
  headless: boolean;
  config: ReturnType<typeof getConfig>;
}

export async function buildServerDeps(opts?: {
  provider?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  headless?: boolean;
}): Promise<ServerDeps> {
  setupLogging();
  initSentry();
  initDb();

  const config = getConfig();
  const providerName = opts?.provider ?? process.env.SEDIMAN_PROVIDER ?? "openai";
  const modelName = opts?.model ?? process.env.SEDIMAN_MODEL;
  const baseUrl = opts?.baseUrl ?? process.env.SEDIMAN_BASE_URL;
  const headless = opts?.headless ?? (process.env.SEDIMAN_HEADLESS ?? "true") === "true";

  // Load API key from auth file if not provided via opts or env
  let apiKey = opts?.apiKey ?? process.env.SEDIMAN_API_KEY;
  if (!apiKey && providerName) {
    const preset = PROVIDERS[providerName];
    if (preset?.api_key_env) {
      const savedKey = await getKey(providerName);
      if (savedKey) {
        apiKey = savedKey;
        console.log(`[buildServerDeps] Loaded API key from auth file for provider: ${providerName}`);
      }
    }
  }

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

  const projectManager = new ProjectManager({
    llmProvider,
    memory,
    skillEngine,
    headless,
    terminalAllowed: false,
  });
  await projectManager.ensureDefaultProject();
  setProjectManager(projectManager);
  sandboxSessionManager.setProjectManager(projectManager);

  const browserSession = new BrowserSession({
    headless,
    stealth: config.stealthEnabled,
    proxy: config.stealthProxy || undefined,
    userDataDir: config.browserProfileDir,
  });

  const browserController = new BrowserController({
    headless,
    userDataDir: config.browserProfileDir,
    session: browserSession,
  });

  const toolRegistry = createAgentToolRegistry({
    terminalAllowed: false,
    memoryManager: memory,
    skillEngine,
    enableBrowserTools: true,
    browserController,
  });

  const agentLoop = new AgentLoop({
    llmProvider,
    browserSession,
    memory,
    skillEngine,
    toolBus: toolRegistry,
    headless,
  });

  return {
    llmProvider,
    browserSession,
    browserController,
    memory,
    skillEngine,
    agentLoop,
    projectManager,
    checkpointManager,
    cronManager,
    hubClient,
    gitHubInstaller,
    skillSearch,
    changelog,
    recordingManager,
    headless,
    config,
  };
}

export function toRpcDeps(deps: ServerDeps): RPCHandlerDeps {
  return {
    llmProvider: deps.llmProvider,
    browserSession: deps.browserSession,
    browserController: deps.browserController,
    projectManager: deps.projectManager,
    memory: deps.memory,
    skillEngine: deps.skillEngine,
    agentLoop: deps.agentLoop,
    checkpointManager: deps.checkpointManager,
    cronManager: deps.cronManager,
    hubClient: deps.hubClient,
    gitHubInstaller: deps.gitHubInstaller,
    skillSearch: deps.skillSearch,
    changelog: deps.changelog,
    tasksCompleted: 0,
    terminalAllowed: false,
    headless: deps.headless,
    sandboxMode: process.env.SEDIMAN_SANDBOX ?? "off",
    activeRecording: null,
  };
}

export function toApiDeps(deps: ServerDeps) {
  return {
    llmProvider: deps.llmProvider,
    browserSession: deps.browserSession,
    memory: deps.memory,
    skillEngine: deps.skillEngine,
    cronManager: deps.cronManager,
    recordingManager: deps.recordingManager,
    agentLoop: deps.agentLoop,
    projectManager: deps.projectManager,
  };
}
