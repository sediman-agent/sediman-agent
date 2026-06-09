import chalk from "chalk";
import { SkillEngine } from "../../../skills/engine.js";

export async function registerSkillShow(name: string): Promise<void> {
  try {
    if (!name) {
      console.error(chalk.red("Error: skill name is required"));
      process.exit(1);
      return;
    }

    const engine = new SkillEngine();
    const skill = engine.read(name);

    if (!skill) {
      console.error(chalk.red(`Skill "${name}" not found.`));
      process.exit(1);
      return;
    }

    console.log(chalk.cyan(`Skill: ${name}\n`));
    console.log(chalk.bold("Description:"), (skill.description as string) ?? "");
    console.log(chalk.bold("Version:"), String(skill.version ?? 1));
    console.log(chalk.bold("Category:"), (skill.category as string) ?? "general");

    if (skill.source) {
      console.log(chalk.bold("Source:"), skill.source as string);
    }

    if (skill.when_to_use) {
      console.log(chalk.bold("\nWhen to use:"), skill.when_to_use as string);
    }

    const steps = skill.steps as string[];
    if (steps.length > 0) {
      console.log(chalk.bold("\nSteps:"));
      for (let i = 0; i < steps.length; i++) {
        console.log(chalk.white(`  ${i + 1}. ${steps[i]}`));
      }
    }

    const variables = skill.variables as string[] | undefined;
    if (variables && variables.length > 0) {
      console.log(chalk.bold("\nVariables:"), variables.map((v) => `{{${v}}}`).join(", "));
    }

    const pitfalls = skill.pitfalls as string[] | undefined;
    if (pitfalls && pitfalls.length > 0) {
      console.log(chalk.bold("\nPitfalls:"));
      for (const p of pitfalls) {
        console.log(chalk.yellow(`  - ${p}`));
      }
    }

    if (skill.verification) {
      console.log(chalk.bold("\nVerification:"), skill.verification as string);
    }

    if (skill.created_at) {
      console.log(chalk.gray(`\nCreated: ${skill.created_at}`));
    }
    if (skill.updated_at) {
      console.log(chalk.gray(`Updated: ${skill.updated_at}`));
    }
    if (skill.use_count) {
      console.log(chalk.gray(`Use count: ${skill.use_count}`));
    }
  } catch (err) {
    console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
}
