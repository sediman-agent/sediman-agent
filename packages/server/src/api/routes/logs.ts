import { Hono } from "hono";
import type { ApiDeps } from "../app";

// Simple in-memory log store
const logStore: Array<{
  id: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  source: string;
  timestamp: Date;
}> = [];

// Add some initial logs
logStore.push(
  {
    id: crypto.randomUUID(),
    level: "info",
    message: "Server started successfully",
    source: "system",
    timestamp: new Date(),
  },
  {
    id: crypto.randomUUID(),
    level: "info",
    message: "API routes initialized",
    source: "api",
    timestamp: new Date(),
  },
  {
    id: crypto.randomUUID(),
    level: "debug",
    message: "Browser controller ready",
    source: "browser",
    timestamp: new Date(),
  }
);

export function createLogsRoutes(deps: ApiDeps): Hono {
  const router = new Hono();

  router.get("/", (c) => {
    const level = c.req.query("level");
    const source = c.req.query("source");
    const limit = parseInt(c.req.query("limit") || "100");

    let filtered = logStore;

    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }

    if (source) {
      filtered = filtered.filter((log) => log.source === source);
    }

    // Return most recent first
    const logs = filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      }));

    return c.json({ logs });
  });

  router.delete("/", (c) => {
    logStore.length = 0;
    return c.json({ cleared: true });
  });

  // Helper function to add logs (can be called from other parts of the app)
  return router;
}

export function addLog(
  level: "info" | "warning" | "error" | "debug",
  message: string,
  source: string = "app"
) {
  logStore.push({
    id: crypto.randomUUID(),
    level,
    message,
    source,
    timestamp: new Date(),
  });

  // Keep only last 1000 logs
  if (logStore.length > 1000) {
    logStore.shift();
  }
}
