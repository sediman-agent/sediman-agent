/**
 * Sandbox Routes
 * Enhanced sandbox routes with session management and Openbrowser integration
 */

import { Hono } from "hono";
import type { ApiDeps } from "../app";
import { sandboxSessionManager } from "../../sandbox/SessionManager.js";

export function createSandboxRoutes(deps: ApiDeps): Hono {
  const router = new Hono();

  // Create new sandbox session
  router.post("/start", async (c) => {
    const body = await c.req.json<{
      name?: string;
      type?: 'browser' | 'computer';
      userId?: string;
      headless?: boolean;
      proxy?: string;
    }>();

    try {
      const session = await sandboxSessionManager.createSession({
        name: body.name,
        type: body.type || 'browser',
        userId: body.userId,
        headless: body.headless,
        proxy: body.proxy,
      });

      return c.json({
        success: session.status === 'running',
        session: {
          id: session.id,
          name: session.name,
          type: session.type,
          status: session.status,
          createdAt: session.createdAt,
          browserInstanceId: session.browserInstanceId,
          metadata: session.metadata,
        },
        error: session.status === 'error' ? session.metadata?.error : undefined,
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create session",
      }, 500);
    }
  });

  // Stop sandbox session
  router.post("/stop", async (c) => {
    const body = await c.req.json<{ sessionId?: string }>();

    // If no sessionId provided, check if there's an active browser session
    if (!body.sessionId && deps.browserSession.isStarted) {
      await deps.browserSession.stop();
      return c.json({ status: "stopped" });
    }

    if (body.sessionId) {
      const success = await sandboxSessionManager.stopSession(body.sessionId);
      return c.json({ success, sessionId: body.sessionId });
    }

    return c.json({ success: false, error: "No session to stop" });
  });

  // Get session status
  router.get("/status", async (c) => {
    const sessionId = c.req.query("sessionId");

    if (sessionId) {
      const session = sandboxSessionManager.getSession(sessionId as string);
      if (session) {
        return c.json({
          session: {
            id: session.id,
            name: session.name,
            type: session.type,
            status: session.status,
            createdAt: session.createdAt,
            lastUsedAt: session.lastUsedAt,
            browserInstanceId: session.browserInstanceId,
            metadata: session.metadata,
          },
        });
      }
      return c.json({ error: "Session not found" }, 404);
    }

    // Return all sessions
    const sessions = sandboxSessionManager.listSessions();
    return c.json({
      sessions,
      total: sessions.length,
      running: sessions.filter(s => s.status === 'running').length,
    });
  });

  // List sessions
  router.get("/list", async (c) => {
    const userId = c.req.query("userId");

    let sessions: any[];
    if (userId) {
      sessions = sandboxSessionManager.listSessionsForUser(userId as string);
    } else {
      sessions = sandboxSessionManager.listSessions();
    }

    return c.json({
      sessions,
      total: sessions.length,
    });
  });

  // Get session details
  router.get("/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const session = sandboxSessionManager.getSession(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json({
      session: {
        id: session.id,
        name: session.name,
        type: session.type,
        status: session.status,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        browserInstanceId: session.browserInstanceId,
        metadata: session.metadata,
      },
    });
  });

  // Delete/cleanup session
  router.delete("/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");

    try {
      await sandboxSessionManager.cleanupSession(sessionId);
      return c.json({ success: true, sessionId });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to cleanup session",
      }, 500);
    }
  });

  // Control sandbox (legacy support)
  router.post("/control", async (c) => {
    const body = await c.req.json<{
      type: string;
      sessionId?: string;
      url?: string;
      selector?: string;
      text?: string;
    }>();

    const adapter = deps.llmProvider; // TODO: Use proper adapter
    return c.json({ ok: true, type: body.type });
  });

  return router;
}

export function createSystemRoutes(deps: ApiDeps): Hono {
  const router = new Hono();

  router.get("/screenshot", async (c) => {
    const sessionId = c.req.query("sessionId");

    // Try to get screenshot from Openbrowser session
    if (sessionId) {
      const session = sandboxSessionManager.getSession(sessionId);
      if (session && session.browserInstanceId) {
        // TODO: Get screenshot from browser instance
      }
    }

    // Fall back to legacy browser session
    if (!deps.browserSession.isStarted) {
      return c.json({ error: "BROWSER_ERROR", message: "browser not started" }, 400);
    }
    const data = await deps.browserSession.takeScreenshot();
    if (!data) {
      return c.json({ error: "BROWSER_ERROR", message: "screenshot failed" }, 500);
    }
    return c.json({ screenshot: data });
  });

  router.get("/status", (c) => {
    const sessions = sandboxSessionManager.listSessions();
    return c.json({
      running: true,
      uptime_secs: process.uptime(),
      browser_open: deps.browserSession.isStarted,
      tasks_completed: 0,
      sandbox_sessions: sessions.length,
      active_sessions: sessions.filter(s => s.status === 'running').length,
    });
  });

  return router;
}
