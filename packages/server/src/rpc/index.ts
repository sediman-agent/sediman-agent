export { RPCServer, type RPCHandler, type NotifyFn } from "./server.js";
export { ERROR_CODES } from "./protocol.js";
export type { RPCHandlerDeps } from "./deps.js";

import { RPCServer } from "./server.js";
import type { RPCHandlerDeps } from "./deps.js";
import type { RPCHandler } from "./server.js";

import { registerSystemHandlers } from "./handlers/system.js";
import { registerBrowserHandlers } from "./handlers/browser.js";
import { registerSkillHandlers } from "./handlers/skills.js";
import { registerHubHandlers } from "./handlers/hub.js";
import { registerMemoryHandlers } from "./handlers/memory.js";
import { registerSessionHandlers } from "./handlers/sessions.js";
import { registerScheduleHandlers } from "./handlers/schedule.js";
import { registerModelHandlers } from "./handlers/model.js";
import { registerAuthHandlers } from "./handlers/auth.js";
import { registerRecordHandlers } from "./handlers/record.js";
import { registerCheckpointHandlers } from "./handlers/checkpoint.js";
import { registerSandboxHandlers } from "./handlers/sandbox.js";
import { registerProjectHandlers } from "./handlers/project.js";

export function createRPCServer(deps: RPCHandlerDeps): RPCServer {
  const server = new RPCServer();
  const handlerMap = new Map<string, RPCHandler>();
  const register = (method: string, handler: RPCHandler) => {
    handlerMap.set(method, handler);
  };
  const fakeServer = {
    register,
    handlers: handlerMap,
    getUptimeSecs: () => server.getUptimeSecs(),
  } as unknown as RPCServer;

  registerSystemHandlers(fakeServer, deps);
  registerBrowserHandlers(fakeServer, deps);
  registerSkillHandlers(fakeServer, deps);
  registerHubHandlers(fakeServer, deps);
  registerMemoryHandlers(fakeServer, deps);
  registerSessionHandlers(fakeServer, deps);
  registerScheduleHandlers(fakeServer, deps);
  registerModelHandlers(fakeServer, deps);
  registerAuthHandlers(fakeServer, deps);
  registerRecordHandlers(fakeServer, deps);
  registerCheckpointHandlers(fakeServer, deps);
  registerSandboxHandlers(fakeServer, deps);
  registerProjectHandlers(fakeServer, deps);

  for (const [method, handler] of handlerMap) {
    server.register(method, handler);
  }
  return server;
}

/**
 * Build a handler map for WebSocket RPC connections
 * @param deps - RPC handler dependencies
 * @param getUptimeSecs - Function to get server uptime in seconds
 * @returns Map of method names to RPC handlers
 */
export function buildHandlerMap(
  deps: RPCHandlerDeps,
  getUptimeSecs: () => number,
): Map<string, RPCHandler> {
  const handlerMap = new Map<string, RPCHandler>();
  const register = (method: string, handler: RPCHandler) => {
    handlerMap.set(method, handler);
  };
  const fakeServer = {
    register,
    handlers: handlerMap,
    getUptimeSecs,
  } as unknown as RPCServer;

  registerSystemHandlers(fakeServer, deps);
  registerBrowserHandlers(fakeServer, deps);
  registerSkillHandlers(fakeServer, deps);
  registerHubHandlers(fakeServer, deps);
  registerMemoryHandlers(fakeServer, deps);
  registerSessionHandlers(fakeServer, deps);
  registerScheduleHandlers(fakeServer, deps);
  registerModelHandlers(fakeServer, deps);
  registerAuthHandlers(fakeServer, deps);
  registerRecordHandlers(fakeServer, deps);
  registerCheckpointHandlers(fakeServer, deps);
  registerSandboxHandlers(fakeServer, deps);
  registerProjectHandlers(fakeServer, deps);

  return handlerMap;
}
