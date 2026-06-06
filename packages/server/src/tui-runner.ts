import { existsSync, unlinkSync } from "node:fs";
import { createServer } from "node:net";
import { spawn } from "child_process";
import { resolve } from "path";

const SOCKET = "/tmp/sediman.sock";

type RPCHandler = (params: Record<string, unknown>) => Promise<unknown>;

const handlers = new Map<string, RPCHandler>();
const startTime = Date.now();

function uptimeSecs() {
  return Math.floor((Date.now() - startTime) / 1000);
}

function register(method: string, handler: RPCHandler) {
  handlers.set(method, handler);
}

async function handleRequest(conn: import("node:net").Socket, raw: string) {
  let id: unknown = null;
  try {
    const msg = JSON.parse(raw);
    id = msg.id;
    const handler = handlers.get(msg.method);
    if (!handler) {
      conn.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } }) + "\n");
      return;
    }
    const result = await handler(msg.params ?? {});
    conn.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
  } catch (err) {
    conn.write(JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: (err as Error).message ?? "Internal error" },
    }) + "\n");
  }
}

if (existsSync(SOCKET)) try { unlinkSync(SOCKET); } catch {}

const server = createServer((conn) => {
  let buf = "";
  conn.on("data", (data) => {
    buf += data.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) handleRequest(conn, line);
    }
  });
});

await new Promise<void>((resolve) => server.listen(SOCKET, () => resolve()));

register("system.status", async () => ({
  running: true,
  uptime_secs: uptimeSecs(),
  browser_open: false,
  tasks_completed: 0,
}));

register("model.list_providers", async () => {
  const { listProvidersWithAuth } = await import("./llm/provider.js");
  return { providers: await listProvidersWithAuth() };
});

register("model.list", async (params) => {
  const { listProvidersWithAuth } = await import("./llm/provider.js");
  const provider = params.provider as string | undefined;
  const providers = await listProvidersWithAuth();
  if (provider) {
    const p = providers.find((pr) => pr.name === provider);
    return { models: p ? [{ id: p.default_model, name: p.default_model, provider: p.name }] : [] };
  }
  return { models: providers.map((p) => ({ id: p.default_model, name: p.default_model, provider: p.name })) };
});

register("model.switch", async (params) => {
  const { createProvider } = await import("./llm/provider.js");
  const provider = params.provider as string;
  const model = params.model as string | undefined;
  const baseUrl = params.base_url as string | undefined;
  try {
    createProvider(provider, model, baseUrl);
    return { switched: true, provider, model: model ?? "default" };
  } catch (err) {
    return { switched: false, error: (err as Error).message };
  }
});

const binRelease = resolve(process.cwd(), "target/release/sediman-tui");
const binDebug = resolve(process.cwd(), "target/debug/sediman-tui");
const tuiBin = existsSync(binRelease) ? binRelease : binDebug;

if (!existsSync(tuiBin)) {
  console.error("Rust TUI binary not found. Run: cargo build --release -p sediman-tui");
  process.exit(1);
}

const tui = spawn(tuiBin, [
  "--socket", SOCKET,
  "--provider", process.env.SEDIMAN_PROVIDER ?? "openai",
  ...(process.env.SEDIMAN_MODEL ? ["--model", process.env.SEDIMAN_MODEL] : []),
  ...(process.env.SEDIMAN_BASE_URL ? ["--base-url", process.env.SEDIMAN_BASE_URL] : []),
  "--no-spawn",
], { stdio: "inherit" });

tui.on("exit", (code) => {
  server.close();
  try { unlinkSync(SOCKET); } catch {}
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  tui.kill();
  server.close();
  try { unlinkSync(SOCKET); } catch {}
  process.exit(0);
});
process.on("SIGTERM", () => {
  tui.kill();
  server.close();
  try { unlinkSync(SOCKET); } catch {}
  process.exit(0);
});

process.on("exit", () => {
  try { unlinkSync(SOCKET); } catch {}
});

const [
  { setupLogging },
  { getConfig },
  { FileMemoryStrategy },
  { SkillEngine },
  { HubClient, GitHubInstaller },
  { SkillSearchEngine },
  { CronManager },
  { Changelog },
  { CheckpointManager },
  { BrowserSession },
  { BrowserController },
  { createProvider },
  { AgentLoop },
] = await Promise.all([
  import("./core/logging.js"),
  import("./core/config.js"),
  import("./memory/strategies/file-memory.js"),
  import("./skills/engine.js"),
  import("./skills/hub.js"),
  import("./skills/search.js"),
  import("./scheduler/cron.js"),
  import("./memory/utils/changelog.js"),
  import("./agent/checkpoint.js"),
  import("./browser/session.js"),
  import("./browser/controller.js"),
  import("./llm/provider.js"),
  import("./agent/loop.js"),
]);

setupLogging();
const config = getConfig();
const headless = (process.env.SEDIMAN_HEADLESS ?? "true") === "true";
const memory = new FileMemoryStrategy();
const skillEngine = new SkillEngine();
const llmProvider = createProvider(
  process.env.SEDIMAN_PROVIDER ?? "openai",
  process.env.SEDIMAN_MODEL,
  process.env.SEDIMAN_BASE_URL,
  process.env.SEDIMAN_API_KEY,
);
const browserSession = new BrowserSession({
  headless,
  stealth: config.stealthEnabled,
  proxy: config.stealthProxy || undefined,
  userDataDir: config.browserProfileDir,
});
const agentLoop = new AgentLoop({ llmProvider, browserSession, memory, skillEngine, headless });

const deps = {
  llmProvider,
  browserSession,
  browserController: new BrowserController(browserSession),
  memory,
  skillEngine,
  agentLoop,
  checkpointManager: new CheckpointManager(),
  cronManager: new CronManager(),
  hubClient: new HubClient(),
  gitHubInstaller: new GitHubInstaller(config.skillsDir),
  skillSearch: new SkillSearchEngine(skillEngine),
  changelog: new Changelog(),
  tasksCompleted: 0,
  terminalAllowed: false,
  headless,
  sandboxMode: process.env.SEDIMAN_SANDBOX ?? "off",
  activeRecording: null,
};

const handlerMods = await Promise.all([
  import("./rpc/handlers/system.js"),
  import("./rpc/handlers/agent.js"),
  import("./rpc/handlers/browser.js"),
  import("./rpc/handlers/skills.js"),
  import("./rpc/handlers/hub.js"),
  import("./rpc/handlers/memory.js"),
  import("./rpc/handlers/sessions.js"),
  import("./rpc/handlers/schedule.js"),
  import("./rpc/handlers/model.js"),
  import("./rpc/handlers/auth.js"),
  import("./rpc/handlers/terminal.js"),
  import("./rpc/handlers/record.js"),
  import("./rpc/handlers/integration.js"),
  import("./rpc/handlers/checkpoint.js"),
  import("./rpc/handlers/sandbox.js"),
]);

for (const mod of handlerMods) {
  const fn = Object.values(mod).find((v) => typeof v === "function") as ((s: any, d: any) => void) | undefined;
  if (fn) fn({ register, handlers, getUptimeSecs: uptimeSecs }, deps);
}

memory.initialize().catch(() => {});
