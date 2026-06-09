import { Hono } from "hono";
import type { ApiDeps } from "../app";
import { executeSkill } from "../../skills/executor";
import { HubClient } from "../../skills/hub";

export function createSkillRoutes(deps: ApiDeps): Hono {
  const router = new Hono();
  const hub = new HubClient();

  router.get("/", (c) => {
    const rawSkills = deps.skillEngine.listSkills();

    // Normalize skills to match frontend expectations
    const skills = rawSkills.map((skill: any) => {
      // Create a unique ID that includes scope to avoid conflicts
      const id = skill.scope === 'external' ? `external:${skill.name}` : skill.name;
      return {
        id,
        name: skill.name,
        description: skill.description,
        version: skill.version?.toString() || "1.0.0",
        author: skill.source || "OpenSkynet",
        installed: skill.scope !== "external",
        tags: skill.tags || skill.keywords || [],
        category: skill.category || "general",
        source: skill.source,
        path: skill.path,
        scope: skill.scope,
      };
    });

    return c.json({ skills });
  });

  router.get("/:id", async (c) => {
    const id = c.req.param("id");

    // Check if it's an external skill
    if (id.startsWith("external:")) {
      const name = id.slice(9); // Remove "external:" prefix
      try {
        // Fetch actual skill data from hub
        const skillData = await hub.info(name);
        return c.json({
          id,
          name,
          description: skillData.description || "",
          version: skillData.version?.toString() || "1.0.0",
          author: skillData.author || skillData.source || "OpenSkynet",
          source: skillData.source,
          scope: "external",
          installed: false,
          // Include the full skill data for viewing
          ...skillData,
        });
      } catch (err) {
        console.error('Failed to fetch skill from hub:', err);
        // Return basic info if hub fetch fails
        return c.json({
          id,
          name,
          description: `External skill: ${name}`,
          version: "1.0.0",
          scope: "external",
          installed: false,
          error: "Could not fetch full skill data from hub",
        });
      }
    }

    // Otherwise, try to get from skill engine
    const skill = deps.skillEngine.getSkill(id);
    if (!skill) {
      return c.json({ error: "NOT_FOUND", message: `skill '${id}' not found` }, 404);
    }
    return c.json({ ...skill, id });
  });

  router.post("/:name/run", async (c) => {
    const name = c.req.param("name");
    const skill = deps.skillEngine.getSkill(name);
    if (!skill) {
      return c.json({ error: "NOT_FOUND", message: `skill '${name}' not found` }, 404);
    }
    const result = await executeSkill(skill, deps.browserSession, deps.llmProvider);
    return c.json({ result });
  });

  router.delete("/:id", (c) => {
    const id = c.req.param("id");

    // External skills cannot be deleted
    if (id.startsWith("external:")) {
      return c.json({ ok: false, error: "Cannot delete external skill" });
    }

    const ok = deps.skillEngine.delete(id);
    return c.json({ ok });
  });

  router.post("/record/start", async (c) => {
    const body = await c.req.json<{ name?: string }>();
    const result = deps.recordingManager.startRecording(body.name ?? "unnamed");
    return c.json(result);
  });

  router.post("/record/:sessionId/stop", (c) => {
    const sessionId = c.req.param("sessionId");
    const result = deps.recordingManager.stopRecording(sessionId);
    return c.json(result);
  });

  router.get("/record/active", (c) => {
    const sessions = deps.recordingManager.getActiveSessions();
    return c.json({ sessions });
  });

  return router;
}
