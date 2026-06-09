import { Hono } from "hono";
import type { ApiDeps } from "../app";

export function createProjectRoutes(deps: ApiDeps): Hono {
  const router = new Hono();

  const pm = deps.projectManager;
  if (!pm) {
    router.get("/*", (c) =>
      c.json({ error: "ProjectManager not available" }, 503)
    );
    return router;
  }

  router.get("/", (c) => {
    const projects = pm.listProjects();
    return c.json({ projects });
  });

  router.post("/", async (c) => {
    const body = await c.req.json<{
      name: string;
      description?: string;
      headless?: boolean;
    }>();

    if (!body.name?.trim()) {
      return c.json({ error: "name is required" }, 400);
    }

    try {
      const project = await pm.createProject({
        name: body.name,
        description: body.description,
        headless: body.headless,
      });
      return c.json({ success: true, project }, 201);
    } catch (err) {
      return c.json(
        { success: false, error: (err as Error).message },
        500
      );
    }
  });

  router.get("/:id", (c) => {
    const project = pm.getProject(c.req.param("id"));
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    return c.json({ project });
  });

  router.patch("/:id", async (c) => {
    const body = await c.req.json<{
      name?: string;
      description?: string;
      headless?: boolean;
    }>();

    const project = pm.updateProject(c.req.param("id"), body);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    return c.json({ success: true, project });
  });

  router.delete("/:id", async (c) => {
    const success = await pm.deleteProject(c.req.param("id"));
    if (!success) {
      return c.json({ error: "Project not found or cannot be deleted" }, 404);
    }
    return c.json({ success: true });
  });

  router.post("/:id/browser/start", async (c) => {
    try {
      await pm.getOrCreateBrowser(c.req.param("id"));
      return c.json({ success: true, project_id: c.req.param("id") });
    } catch (err) {
      return c.json(
        { success: false, error: (err as Error).message },
        500
      );
    }
  });

  router.post("/:id/browser/stop", async (c) => {
    try {
      await pm.stopProjectBrowser(c.req.param("id"));
      return c.json({ success: true, project_id: c.req.param("id") });
    } catch (err) {
      return c.json(
        { success: false, error: (err as Error).message },
        500
      );
    }
  });

  router.get("/:id/conversations", (c) => {
    const conversations = pm.listConversations(c.req.param("id"));
    return c.json({ conversations });
  });

  router.post("/:id/conversations", async (c) => {
    const projectId = c.req.param("id");
    const project = pm.getProject(projectId);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    try {
      const body = await c.req.json<{ task: string; agent_mode?: string }>();
      if (!body.task?.trim()) {
        return c.json({ error: "task is required" }, 400);
      }

      const conv = pm.createConversation(
        projectId,
        body.task,
        body.agent_mode ?? "browser",
      );
      return c.json({ success: true, conversation: conv }, 201);
    } catch (err) {
      return c.json(
        { success: false, error: (err as Error).message },
        400
      );
    }
  });

  router.get("/:id/conversations/:convId", (c) => {
    const conv = pm.getConversation(c.req.param("convId"));
    if (!conv) {
      return c.json({ error: "Conversation not found" }, 404);
    }
    return c.json({ conversation: conv });
  });

  router.delete("/:id/conversations/:convId", (c) => {
    const success = pm.deleteConversation(c.req.param("convId"));
    if (!success) {
      return c.json({ error: "Conversation not found" }, 404);
    }
    return c.json({ success: true });
  });

  return router;
}
