import type { RPCServer } from "../server.js";
import type { RPCHandlerDeps } from "../deps.js";

export function registerProjectHandlers(
  server: RPCServer,
  deps: RPCHandlerDeps,
): void {
  server.register("project.create", async (params) => {
    const name = params.name as string;
    if (!name?.trim()) return { success: false, error: "name is required" };

    try {
      const project = await deps.projectManager.createProject({
        name,
        description: params.description as string | undefined,
        headless: params.headless as boolean | undefined,
      });
      return { success: true, project };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  server.register("project.list", async () => {
    const projects = deps.projectManager.listProjects();
    return { projects };
  });

  server.register("project.get", async (params) => {
    const id = params.id as string;
    if (!id) return { success: false, error: "id is required" };

    const project = deps.projectManager.getProject(id);
    if (!project) return { success: false, error: "Project not found" };
    return { success: true, project };
  });

  server.register("project.update", async (params) => {
    const id = params.id as string;
    if (!id) return { success: false, error: "id is required" };

    const project = deps.projectManager.updateProject(id, {
      name: params.name as string | undefined,
      description: params.description as string | undefined,
      headless: params.headless as boolean | undefined,
    });
    if (!project) return { success: false, error: "Project not found" };
    return { success: true, project };
  });

  server.register("project.delete", async (params) => {
    const id = params.id as string;
    if (!id) return { success: false, error: "id is required" };

    const success = await deps.projectManager.deleteProject(id);
    return { success };
  });

  server.register("project.start_browser", async (params) => {
    const id = params.id as string;
    if (!id) return { success: false, error: "id is required" };

    try {
      await deps.projectManager.getOrCreateBrowser(id);
      return { success: true, project_id: id };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  server.register("project.stop_browser", async (params) => {
    const id = params.id as string;
    if (!id) return { success: false, error: "id is required" };

    try {
      await deps.projectManager.stopProjectBrowser(id);
      return { success: true, project_id: id };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  server.register("project.create_conversation", async (params) => {
    const projectId = params.project_id as string;
    const task = params.task as string;
    if (!projectId) return { success: false, error: "project_id is required" };
    if (!task?.trim()) return { success: false, error: "task is required" };

    const conv = deps.projectManager.createConversation(
      projectId,
      task,
      params.agent_mode as string | undefined,
    );
    return { success: true, conversation: conv };
  });

  server.register("project.list_conversations", async (params) => {
    const projectId = params.project_id as string;
    if (!projectId) return { success: false, error: "project_id is required" };

    const conversations = deps.projectManager.listConversations(projectId);
    return { conversations };
  });

  server.register("project.get_conversation", async (params) => {
    const conversationId = params.conversation_id as string;
    if (!conversationId) return { success: false, error: "conversation_id is required" };

    const conv = deps.projectManager.getConversation(conversationId);
    if (!conv) return { success: false, error: "Conversation not found" };
    return { success: true, conversation: conv };
  });

  server.register("project.delete_conversation", async (params) => {
    const conversationId = params.conversation_id as string;
    if (!conversationId) return { success: false, error: "conversation_id is required" };

    const success = deps.projectManager.deleteConversation(conversationId);
    return { success };
  });

  server.register("project.run_agent", async (params) => {
    const projectId = (params.project_id as string) || "__default__";
    const task = params.task as string;
    if (!task?.trim()) return { success: false, error: "task is required" };

    try {
      const instance = await deps.projectManager.getOrCreateBrowser(projectId);
      const agentLoop = instance.agentLoop || deps.agentLoop;
      const result = await agentLoop.run(task, params.mode as string | undefined);
      return { success: true, result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
