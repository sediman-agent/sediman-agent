import { Hono } from "hono";
import { cors } from "hono/cors";
import { getConfig } from "../core/config";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { createTaskRoutes } from "./routes/task";
import { createSkillRoutes } from "./routes/skills";
import { createHubRoutes } from "./routes/hub";
import { createScheduleRoutes } from "./routes/schedule";
import { createMemoryRoutes } from "./routes/memory";
import { createSessionRoutes } from "./routes/sessions";
import { createSandboxRoutes, createSystemRoutes } from "./routes/sandbox";
import { createAgentRoutes } from "./routes/agent.js";
import { createAuthRoutes } from "./routes/auth.js";
import { createModelRoutes } from "./routes/model.js";
import { createFileRoutes } from "./routes/files.js";
import { createLogsRoutes } from "./routes/logs.js";
import { createProjectRoutes } from "./routes/project.js";
import { createBrowserRoutes } from "./routes/browser";
import type { AgentLoop } from "../agent/loop";
import type { LLMProvider } from "../llm/provider";
import type { ProjectManager } from "../project/manager";

export interface ApiDeps {
  llmProvider: any;
  browserSession: any;
  memory: any;
  skillEngine: any;
  cronManager: any;
  recordingManager: any;
  agentLoop: AgentLoop;
  projectManager?: ProjectManager;
}

export function createApiApp(deps: ApiDeps): Hono {
  const config = getConfig();
  const app = new Hono();

  app.use("*", corsMiddleware(config.corsOrigins));
  app.use("*", errorHandler);

  app.route("/api/task", createTaskRoutes(deps));
  app.route("/api/skills", createSkillRoutes(deps));
  app.route("/api/hub", createHubRoutes(deps));
  app.route("/api/schedule", createScheduleRoutes(deps));
  app.route("/api/memory", createMemoryRoutes(deps));
  app.route("/api/sessions", createSessionRoutes(deps));
  app.route("/api/sandbox", createSandboxRoutes(deps));
  app.route("/api", createSystemRoutes(deps));
  app.route("/api/agent", createAgentRoutes(deps));
  app.route("/api/auth", createAuthRoutes());
  app.route("/api/model", createModelRoutes(deps));
  app.route("/api/files", createFileRoutes(deps));
  app.route("/api/logs", createLogsRoutes(deps));
  app.route("/api/projects", createProjectRoutes(deps));
  app.route("/api/browser", createBrowserRoutes());

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  return app;
}
