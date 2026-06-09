import chalk from "chalk";
import { buildServerDeps } from "../deps.js";
import { cleanupBrowserTools } from "../../agent/tools/browser-tools.js";
import { closeDb } from "../../store/db.js";

export function registerRunCommand(cli: any): void {
  cli
    .command("run <task>", "Execute a one-shot task")
    .option("--provider <provider>", "LLM provider to use")
    .option("--model <model>", "Model to use")
    .option("--base-url <url>", "Custom base URL for the provider")
    .option("--headless", "Run browser in headless mode", { default: true })
    .help()
    .action(async (task: string, options: any) => {
      const startTime = Date.now();
      console.log(chalk.cyan(`Running task: ${task}`));
      console.log(chalk.gray(`Provider: ${options.provider ?? "default"}`));
      console.log(chalk.gray(`Model: ${options.model ?? "default"}`));
      console.log();

      const deps = await buildServerDeps({
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        headless: options.headless,
      });

      try {
        const result = await deps.agentLoop.run(task);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (result.success) {
          console.log(chalk.green(`\n✓ Task completed successfully (${elapsed}s, ${result.iterations} iterations)`));
        } else {
          console.log(chalk.red(`\n✗ Task failed (${elapsed}s, ${result.iterations} iterations)`));
        }

        if (result.strategy_used) {
          console.log(chalk.gray(`Strategy: ${result.strategy_used}`));
        }

        if (result.result) {
          console.log();
          console.log(result.result);
        }

        if (result.actions_taken.length > 0) {
          console.log(chalk.gray(`\nActions: ${result.actions_taken.join(", ")}`));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
      } finally {
        try { await cleanupBrowserTools(); } catch {}
        closeDb();
        process.exit(0);
      }
    });
}
