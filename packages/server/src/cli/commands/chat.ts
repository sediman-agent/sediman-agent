import { createInterface } from "node:readline";
import chalk from "chalk";
import { buildServerDeps } from "../deps.js";
import { cleanupBrowserTools } from "../../agent/tools/browser-tools.js";
import { closeDb } from "../../store/db.js";

export function registerChatCommand(cli: any): void {
  cli
    .command("chat", "Start an interactive chat session")
    .option("--provider <provider>", "LLM provider to use")
    .option("--model <model>", "Model to use")
    .option("--base-url <url>", "Custom base URL for the provider")
    .option("--headless", "Run browser in headless mode", { default: true })
    .help()
    .action(async (options: any) => {
      console.log(chalk.cyan("Starting interactive chat session..."));
      console.log(chalk.gray("Type your task and press Enter. Type 'exit' or Ctrl+C to quit."));
      console.log();

      const deps = await buildServerDeps({
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        headless: options.headless,
      });

      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = () => {
        rl.question(chalk.blue("> "), async (task: string) => {
          const trimmed = task.trim();
          if (!trimmed || trimmed === "exit" || trimmed === "quit") {
            await shutdown();
            return;
          }

          try {
            const result = await deps.agentLoop.run(trimmed);

            if (result.success) {
              console.log(chalk.green(`\n✓ Completed (${result.iterations} iterations, ${result.elapsed_secs}s)`));
            } else {
              console.log(chalk.red(`\n✗ Failed (${result.iterations} iterations, ${result.elapsed_secs}s)`));
            }

            if (result.result) {
              console.log(result.result);
            }
            console.log();
          } catch (err) {
            console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
          }

          prompt();
        });
      };

      const shutdown = async () => {
        console.log(chalk.yellow("\nShutting down..."));
        rl.close();
        try { await cleanupBrowserTools(); } catch {}
        closeDb();
        process.exit(0);
      };

      process.on("SIGINT", () => shutdown());
      prompt();
    });
}
