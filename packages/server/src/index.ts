import { setupLogging, createLogger } from "./core/logging";
import { addLog } from "./api/routes/logs";
import { cleanupBrowserTools } from "./agent/tools/browser-tools";
import { closeDb } from "./store/db";
import { createRPCServer } from "./rpc";
import { startApiServer } from "./api";
import { buildServerDeps, toRpcDeps, toApiDeps } from "./cli/deps";
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

  const logger = createLogger("server");
  addLog("info", `Server starting in ${mode} mode`, "system");

  const deps = await buildServerDeps();

  if (mode === "rpc") {
    const rpcDeps = toRpcDeps(deps);
    const rpcServer = createRPCServer(rpcDeps);
    const rpcSocket = process.env.SEDIMAN_RPC_SOCKET ?? "/tmp/sediman.sock";
    await rpcServer.listen(rpcSocket);
    addLog("info", `RPC server listening on ${rpcSocket}`, "system");
    logger.info({ mode: "rpc", socket: rpcSocket }, "server_started");

    deps.memory.initialize().catch(() => {});

    const shutdown = async (signal: string) => {
      logger.info({ signal }, "shutting_down");
      try { await rpcServer.stop(); } catch {}
      try { await cleanupBrowserTools(); } catch {}
      closeDb();
      logger.info("shutdown_complete");
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    logger.info({ mode: "rpc" }, "sediman_server_ready");
    return;
  }

  const rpcDeps: RPCHandlerDeps = toRpcDeps(deps);
  const apiDeps = toApiDeps(deps);

  const servers: { stop: () => Promise<void> }[] = [];

  if (mode === "all") {
    const rpcServer = createRPCServer(rpcDeps);
    const rpcSocket = process.env.SEDIMAN_RPC_SOCKET ?? "/tmp/sediman.sock";
    await rpcServer.listen(rpcSocket);
    servers.push(rpcServer);
    addLog("info", `RPC server listening on ${rpcSocket}`, "system");
    logger.info({ mode: "rpc", socket: rpcSocket }, "server_started");
  }

  if (mode === "api" || mode === "all") {
    const apiServer = startApiServer({ deps: apiDeps, rpcDeps });
    servers.push({ stop: async () => apiServer.stop() });
    addLog("info", "API server started", "system");
    logger.info({ mode: "api" }, "server_started");
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting_down");
    addLog("warning", `Server shutting down (${signal})`, "system");
    for (const s of servers) {
      try {
        await s.stop();
      } catch (err) {
        logger.error({ err: (err as Error).message }, "server_stop_error");
      }
    }

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

export { getConfig } from "./core/config";
export type { Config } from "./core/config";
export { getDb, initDb, closeDb } from "./store/db";
