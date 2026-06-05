/**
 * IPC Channel Constants
 * Shared between main and renderer processes
 */

export const IPC_CHANNELS = {
  // Browser control
  BROWSER_NAVIGATE: 'browser:navigate',
  BROWSER_BACK: 'browser:back',
  BROWSER_FORWARD: 'browser:forward',
  BROWSER_RELOAD: 'browser:reload',
  BROWSER_GET_STATE: 'browser:get-state',
  BROWSER_GET_SCREENSHOT: 'browser:get-screenshot',
  BROWSER_EXECUTE_SCRIPT: 'browser:execute-script',

  // Browser events
  BROWSER_EVENT: 'browser:event',
  BROWSER_STATE_CHANGE: 'browser:state-change',
  BROWSER_NAVIGATED: 'browser:navigated',
  BROWSER_READY: 'browser:ready',
  BROWSER_ERROR: 'browser:error',

  // Agent communication
  AGENT_REQUEST_BROWSER: 'agent:request-browser',
  AGENT_BROWSER_RESPONSE: 'agent:browser-response',
  AGENT_REQUEST_SCREENSHOT: 'agent:request-screenshot',
  AGENT_SCREENSHOT_RESPONSE: 'agent:screenshot-response',

  // Sandbox control
  SANDBOX_START: 'sandbox:start',
  SANDBOX_STOP: 'sandbox:stop',
  SANDBOX_STATUS: 'sandbox:status',
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
