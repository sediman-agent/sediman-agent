import chalk from "chalk";
import { buildServerDeps, toApiDeps, toRpcDeps } from "../deps.js";
import { startApiServer } from "../../api/index.js";
import { createRPCServer } from "../../rpc/index.js";
import { createLogger } from "../../core/logging.js";
import { addLog } from "../../api/routes/logs.js";
import { cleanupBrowserTools } from "../../agent/tools/browser-tools.js";
import { closeDb } from "../../store/db.js";

export function registerServeCommand(cli: any): void {
  cli
    .command("serve", "Start the API server")
    .option("--port <port>", "Server port", { default: 3001 })
    .option("--host <host>", "Server host (unused — bound via Bun)", { default: "0.0.0.0" })
    .option("--rpc", "Also start RPC server", { default: false })
    .help()
    .action(async (options: any) => {
      const port = parseInt(options.port, 10);
      console.log(chalk.cyan(`Starting API server on port ${port}...`));

      const deps = await buildServerDeps();
      const logger = createLogger("serve");
      const servers: { stop: () => Promise<void> }[] = [];

      const apiDeps = toApiDeps(deps);
      const rpcDeps = toRpcDeps(deps);

      if (options.rpc) {
        const rpcServer = createRPCServer(rpcDeps);
        const rpcSocket = process.env.SEDIMAN_RPC_SOCKET ?? "/tmp/sediman.sock";
        await rpcServer.listen(rpcSocket);
        servers.push(rpcServer);
        console.log(chalk.green(`RPC server listening on ${rpcSocket}`));
      }

      const apiServer = startApiServer({ port, deps: apiDeps, rpcDeps });
      servers.push({ stop: async () => apiServer.stop() });

      addLog("info", "API server started", "system");
      console.log(chalk.green(`API server listening on port ${port}`));

      const shutdown = async (signal: string) => {
        console.log(chalk.yellow(`\nShutting down (${signal})...`));
        addLog("warning", `Server shutting down (${signal})`, "system");
        for (const s of servers) {
          try { await s.stop(); } catch {}
        }
        try { await cleanupBrowserTools(); } catch {}
        closeDb();
        process.exit(0);
      };

      process.on("SIGINT", () => shutdown("SIGINT"));
      process.on("SIGTERM", () => shutdown("SIGTERM"));
    });
}
