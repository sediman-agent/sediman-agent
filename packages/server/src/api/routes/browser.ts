import { Hono } from "hono";

// Store the latest screenshot globally (in production, this would be in a proper state manager)
let latestScreenshot: { data: string; url: string; timestamp: number } | null = null;

export function setLatestScreenshot(data: string, url: string) {
  latestScreenshot = { data, url, timestamp: Date.now() };
}

export function createBrowserRoutes(): Hono {
  const router = new Hono();

  // Get the latest screenshot from the agent's browser
  router.get("/screenshot", (c) => {
    if (!latestScreenshot) {
      return c.json({ error: "No screenshot available" }, 404);
    }

    const age = Date.now() - latestScreenshot.timestamp;

    return c.json({
      url: latestScreenshot.url,
      data: latestScreenshot.data,
      timestamp: latestScreenshot.timestamp,
      age: age
    });
  });

  return router;
}
