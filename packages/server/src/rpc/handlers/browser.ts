import type { RPCServer } from "../server.js";
import type { RPCHandlerDeps } from "../deps.js";
import type { BrowserController } from "../../browser/controller.js";
import type { BrowserSession } from "../../browser/session.js";

function resolveController(deps: RPCHandlerDeps, params: Record<string, unknown>): BrowserController | null {
  const projectId = params.project_id as string | undefined;
  if (projectId) {
    return deps.projectManager.getBrowserController(projectId);
  }
  return deps.browserController;
}

function resolveSession(deps: RPCHandlerDeps, params: Record<string, unknown>): BrowserSession | null {
  const projectId = params.project_id as string | undefined;
  if (projectId) {
    return deps.projectManager.getBrowserSession(projectId);
  }
  return deps.browserSession;
}

function isBrowserStarted(deps: RPCHandlerDeps, params: Record<string, unknown>): boolean {
  const session = resolveSession(deps, params);
  return session?.isStarted ?? false;
}

async function ensureBrowserStarted(deps: RPCHandlerDeps, params: Record<string, unknown>): Promise<void> {
  const projectId = params.project_id as string | undefined;
  if (projectId) {
    await deps.projectManager.getOrCreateBrowser(projectId);
  } else if (!deps.browserSession.isStarted) {
    await deps.browserSession.start();
  }
}

export function registerBrowserHandlers(
  server: RPCServer,
  deps: RPCHandlerDeps,
): void {
  // === Browser Handlers (Playwright-based) ===

  server.register("browser.configure", async (params) => {
    const headless = (params.headless as boolean) ?? true;
    deps.browserSession.headless = headless;
    deps.headless = headless;
    return { configured: true, headless };
  });

  server.register("browser.goto", async (params) => {
    const url = params.url as string;
    if (!url) return { success: false, error: "Missing url parameter" };

    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      const msg = await controller.navigate(url);
      const success = !msg.startsWith("Failed");
      return { success, url: success ? url : undefined, error: success ? undefined : msg };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  server.register("browser.click", async (params) => {
    const selector = params.selector as string;
    const refId = params.ref_id as number | undefined;

    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      if (refId !== undefined) {
        const msg = await controller.click(refId);
        return { success: !msg.startsWith("Failed"), selector, error: msg.startsWith("Failed") ? msg : undefined };
      }
      return { success: false, selector, error: "No selector or ref_id provided" };
    } catch (err) {
      return { success: false, selector, error: (err as Error).message };
    }
  });

  server.register("browser.fill", async (params) => {
    const selector = params.selector as string;
    const value = params.value as string;
    const refId = params.ref_id as number | undefined;

    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      if (refId !== undefined) {
        const submit = params.submit as boolean | undefined;
        const msg = await controller.typeText(refId, value, submit);
        return { success: !msg.startsWith("Failed"), selector, error: msg.startsWith("Failed") ? msg : undefined };
      }
      return { success: false, selector, error: "No ref_id provided" };
    } catch (err) {
      return { success: false, selector, error: (err as Error).message };
    }
  });

  server.register("browser.wait", async (params) => {
    const selector = params.selector as string;
    const timeout = params.timeout as number | undefined;

    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      const msg = await controller.waitForSelector(selector, timeout);
      const success = !msg.startsWith("Timeout");
      return { success, selector, error: success ? undefined : msg };
    } catch (err) {
      return { success: false, selector, error: (err as Error).message };
    }
  });

  server.register("browser.screenshot", async (params) => {
    if (!isBrowserStarted(deps, params)) {
      return { success: false, error: "Browser not started" };
    }

    const session = resolveSession(deps, params);
    const screenshot = session ? await session.takeScreenshot() : null;
    return {
      success: !!screenshot,
      screenshot: screenshot || "",
      error: screenshot ? undefined : "Screenshot failed",
    };
  });

  server.register("browser.extract_text", async (params) => {
    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      const text = await controller.extractText();
      return { success: true, output: text };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Extract text failed",
      };
    }
  });

  server.register("browser.snapshot", async (params) => {
    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      const snapshot = await controller.snapshot();
      return { success: true, output: snapshot };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Snapshot failed",
      };
    }
  });

  server.register("browser.back", async (params) => {
    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      const msg = await controller.goBack();
      return { success: !msg.startsWith("Failed"), error: msg.startsWith("Failed") ? msg : undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Navigation failed" };
    }
  });

  server.register("browser.forward", async (params) => {
    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      const msg = await controller.goForward();
      return { success: !msg.startsWith("Failed"), error: msg.startsWith("Failed") ? msg : undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Navigation failed" };
    }
  });

  server.register("browser.refresh", async (params) => {
    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      const msg = await controller.refresh();
      return { success: !msg.startsWith("Failed"), error: msg.startsWith("Failed") ? msg : undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Refresh failed" };
    }
  });

  server.register("browser.get_url", async (params) => {
    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      const url = await controller.getUrl();
      return { success: true, url };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Get URL failed" };
    }
  });

  server.register("browser.get_title", async (params) => {
    await ensureBrowserStarted(deps, params);
    const controller = resolveController(deps, params);
    if (!controller) return { success: false, error: "Browser not started" };

    try {
      const title = await controller.getTitle();
      return { success: true, title };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Get title failed" };
    }
  });
}
