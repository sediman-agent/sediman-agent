/**
 * Browser Services Module
 * Exports all browser-related services
 */

export { IPC_CHANNELS } from './IPCChannels';
export type { IPCChannel } from './IPCChannels';

export { setupRendererIPC, initializeRendererIPC } from './RendererIPC';
export { setupMainIPC, BrowserController } from './MainIPC';

// For backward compatibility
export { browserService } from '../BrowserService';
