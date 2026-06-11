import type { RPCServer } from "../server.js";
import type { RPCHandlerDeps } from "../deps.js";
import { takeBrowserScreenshot } from "../../agent/tools/browser-tools.js";

export function registerSandboxHandlers(
  server: RPCServer,
  deps: RPCHandlerDeps,
): void {
  server.register("sandbox.start", async (params) => {
    const projectId = (params.project_id as string) || "__default__";
    const image = (params.image as string) ?? "default";

    try {
      await deps.projectManager.getOrCreateBrowser(projectId);
      return {
        started: true,
        container_id: `sandbox_${projectId}`,
        image,
        project_id: projectId,
      };
    } catch (err) {
      return {
        started: false,
        error: (err as Error).message,
      };
    }
  });

  server.register("sandbox.stop", async (params) => {
    const projectId = (params.project_id as string) || "__default__";
    try {
      await deps.projectManager.stopProjectBrowser(projectId);
      return { stopped: true, project_id: projectId };
    } catch (err) {
      return { stopped: false, error: (err as Error).message };
    }
  });

  server.register("sandbox.status", async (params) => {
    const projectId = (params.project_id as string) || "__default__";
    try {
      const instance = await deps.projectManager.getOrCreateBrowser(projectId);
      return {
        running: instance !== null,
        mode: deps.sandboxMode,
        project_id: projectId,
      };
    } catch {
      return {
        running: false,
        mode: deps.sandboxMode,
        project_id: projectId,
      };
    }
  });

  server.register("sandbox.set_mode", async (params) => {
    const mode = params.mode as string;
    deps.sandboxMode = mode;
    return { set: true, mode };
  });

  server.register("sandbox.control", async (params) => {
    const action = params.action as string;
    return { success: true, action, output: "" };
  });

  server.register("sandbox.test_browser", async (params) => {
    const projectId = (params.project_id as string) || "__default__";
    const controller = deps.projectManager.getBrowserController(projectId);
    if (!controller) {
      return { success: false, error: "Browser not started" };
    }

    try {
      let screenshot = await takeBrowserScreenshot(projectId);
      if (!screenshot) {
        const session = deps.projectManager.getBrowserSession(projectId);
        if (session) {
          screenshot = await session.takeScreenshot();
        }
      }
      return { success: true, has_screenshot: !!screenshot };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  server.register("sandbox.screenshot", async (params) => {
    const projectId = (params.project_id as string) || "__default__";
    let screenshot = await takeBrowserScreenshot(projectId);
    if (!screenshot) {
      const session = deps.projectManager.getBrowserSession(projectId);
      if (session) {
        screenshot = await session.takeScreenshot();
      }
    }
    return { screenshot: screenshot ?? "" };
  });
}
