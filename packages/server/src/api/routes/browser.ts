import { Hono } from "hono";
import type { BrowserSession } from "../../browser/session";
import { getBrowserController, hasPendingIntervention, getPendingIntervention, resolveIntervention } from "../../agent/tools/browser-tools";

// Store the latest screenshot globally (in production, this would be in a proper state manager)
let latestScreenshot: { data: string; url: string; timestamp: number } | null = null;

export function setLatestScreenshot(data: string, url: string) {
  latestScreenshot = { data, url, timestamp: Date.now() };
}

export function createBrowserRoutes(browserSession?: BrowserSession): Hono {
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

  // Connect Playwright to Electron webview via CDP for shared browser
  router.post("/connect-cdp", async (c) => {
    if (!browserSession) {
      return c.json({ error: "Browser session not available" }, 500);
    }

    try {
      const body = await c.req.json<{ webSocketDebuggerUrl: string }>();
      if (!body.webSocketDebuggerUrl) {
        return c.json({ error: "webSocketDebuggerUrl is required" }, 400);
      }

      console.log("[CDP] Connecting to:", body.webSocketDebuggerUrl.substring(0, 80) + "...");
      await browserSession.connectViaCDP(body.webSocketDebuggerUrl);
      console.log("[CDP] Connected! Shared browser is now active.");

      return c.json({ success: true, message: "Connected to shared browser" });
    } catch (err) {
      console.error("[CDP] Connection failed:", err);
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });

  // Browser view — renders the Playwright page as a stream of JPEG frames.
  // Same approach as Cursor: fast screenshot polling, forwarded user input via CDP.
  router.post("/ensure-started", async (c) => {
    const ctrl = getBrowserController();
    if (!ctrl) return c.json({ error: "No browser controller. Start an agent task first." }, 500);
    try {
      const session = ctrl.getSession();
      if (!session || !session.isStarted) {
        console.log('[BrowserAPI] Auto-starting browser for panel...');
        await ctrl.start();
      }
      const ctx = ctrl.getSession()?.context;
      if (ctx) {
        const pages = ctx.pages();
        if (pages.length === 0) {
          const page = await ctx.newPage();
          await page.goto('about:blank', { waitUntil: 'domcontentloaded' }).catch(() => {});
        }
      }
      const url = ctrl.getSession()?.context?.pages()[0]?.url() || 'about:blank';
      return c.json({ success: true, url });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  router.get("/screencast-frame", async (c) => {
    const ctrl = getBrowserController();
    if (!ctrl) return c.json({ error: "No browser controller" }, 500);

    const page = ctrl.getSession()?.context?.pages()[0];
    if (!page) return c.json({ error: "No page available" }, 404);

    try {
      const buf = await page.screenshot({ type: 'jpeg', quality: 80 });
      const frame = buf.toString('base64');
      return c.json({
        frame,
        url: page.url() || "about:blank",
        timestamp: Date.now(),
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  router.post("/screencast/input", async (c) => {
    const ctrl = getBrowserController();
    if (!ctrl) return c.json({ error: "No browser controller" }, 500);
    try {
      const body = await c.req.json<{
        mouse?: { type: string; x: number; y: number; button?: string; buttons?: number };
        key?: { type: string; key: string; code?: string; text?: string };
        scroll?: { deltaX: number; deltaY: number };
      }>();
      if (body.mouse) {
        await ctrl.dispatchMouse(
          body.mouse.type,
          body.mouse.x,
          body.mouse.y,
          body.mouse.button || 'left',
          body.mouse.buttons ?? (body.mouse.type === 'mouseReleased' ? 0 : 1),
        );
      }
      if (body.key) {
        await ctrl.dispatchKey(body.key.type, body.key.key, body.key.code, body.key.text);
      }
      if (body.scroll) {
        const page = ctrl.getSession()?.context?.pages()[0];
        if (page) await page.mouse.wheel(body.scroll.deltaX, body.scroll.deltaY);
      }
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // Navigate browser to a URL — called from the URL bar
  router.post("/navigate", async (c) => {
    const ctrl = getBrowserController();
    if (!ctrl) return c.json({ error: "No browser controller" }, 500);
    try {
      const body = await c.req.json<{ url: string }>();
      if (!body.url) return c.json({ error: "url is required" }, 400);
      const result = await ctrl.navigate(body.url);
      return c.json({ success: true, result });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // Manual browser action — user intervenes in the shared browser
  router.post("/action", async (c) => {
    const ctrl = getBrowserController();
    if (!ctrl) {
      return c.json({ error: "Browser not available" }, 500);
    }

    try {
      const body = await c.req.json<{
        action: 'type' | 'click' | 'clickAt' | 'navigate' | 'screenshot';
        text?: string;
        refId?: number;
        x?: number;
        y?: number;
        url?: string;
      }>();

      console.log("[Browser] Manual action:", body.action, body);

      switch (body.action) {
        case 'type':
          if (body.refId !== undefined && body.text !== undefined) {
            const result = await ctrl.typeText(body.refId, body.text, true);
            return c.json({ success: true, result });
          }
          break;
        case 'click':
          if (body.refId !== undefined) {
            const result = await ctrl.click(body.refId);
            return c.json({ success: true, result });
          }
          break;
        case 'clickAt':
          if (body.x !== undefined && body.y !== undefined) {
            const page = ctrl.getSession()?.context?.pages()[0];
            if (page) {
              await page.mouse.click(body.x, body.y);
              return c.json({ success: true, result: `Clicked at (${body.x}, ${body.y})` });
            }
          }
          break;
        case 'navigate':
          if (body.url) {
            const result = await ctrl.navigate(body.url);
            return c.json({ success: true, result });
          }
          break;
        case 'screenshot':
          const shot = await ctrl.screenshot();
          if (shot) {
            setLatestScreenshot(shot, body.url || '');
          }
          return c.json({ success: true, result: 'Screenshot taken' });
      }

      return c.json({ error: "Invalid or incomplete action parameters" }, 400);
    } catch (err) {
      console.error("[Browser] Manual action failed:", err);
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });

  // Human intervention endpoints — agent asks user for help, user clicks Done
  router.get("/intervention", (c) => {
    const intervention = getPendingIntervention();
    if (!intervention) {
      return c.json({ active: false });
    }
    return c.json({
      active: true,
      id: intervention.id,
      message: intervention.message,
    });
  });

  router.post("/intervention-done", async (c) => {
    const body = await c.req.json<{ message?: string }>();
    const resolved = resolveIntervention(body.message || 'User completed the task');
    if (!resolved) {
      return c.json({ error: "No pending intervention" }, 404);
    }
    console.log("[Intervention] User completed: ", body.message);
    return c.json({ success: true });
  });

  return router;
}
