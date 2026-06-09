import type { LLMProvider } from "../llm/provider";
import type { BrowserSession } from "../browser/session";
import type { BrowserController } from "../browser/controller";
import type { BaseMemoryStrategy } from "../memory/strategy";
import type { SkillEngine } from "../skills/engine";
import type { AgentLoop } from "../agent/loop";
import type { CheckpointManager } from "../agent/memory/checkpoint";
import type { CronManager } from "../scheduler/cron";
import type { HubClient, GitHubInstaller } from "../skills/hub";
import type { SkillSearchEngine } from "../skills/search";
import type { Changelog } from "../memory/utils/changelog";
import type { ProjectManager } from "../project/manager";

export interface RPCHandlerDeps {
  llmProvider: LLMProvider;
  browserSession: BrowserSession;
  browserController: BrowserController;
  memory: BaseMemoryStrategy;
  skillEngine: SkillEngine;
  agentLoop: AgentLoop;
  projectManager: ProjectManager;
  checkpointManager: CheckpointManager;
  cronManager: CronManager;
  hubClient: HubClient;
  gitHubInstaller: GitHubInstaller;
  skillSearch: SkillSearchEngine;
  changelog: Changelog;
  tasksCompleted: number;
  terminalAllowed: boolean;
  headless: boolean;
  sandboxMode: string;
  activeRecording: { id: string; name: string; status: string } | null;
}
