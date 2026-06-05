/**
 * Renderer Process IPC Handlers
 * Handles IPC communication in the renderer process (React app)
 */

import { IPC_CHANNELS } from './IPCChannels';
import { browserService } from '../BrowserService';

interface IpcRendererEvent {
  replyTo?: string;
}

/**
 * Setup IPC handlers for renderer process
 */
export function setupRendererIPC(): void {
  if (typeof window === 'undefined' || !window.require) {
    console.warn('[RendererIPC] Not in Electron environment');
    return;
  }

  try {
    const { ipcRenderer } = window.require('electron');

    // Browser control commands
    ipcRenderer.on(IPC_CHANNELS.BROWSER_NAVIGATE, (_: unknown, url: string) => {
      console.log('[RendererIPC] Navigate:', url);
      browserService.navigate(url);
    });

    ipcRenderer.on(IPC_CHANNELS.BROWSER_BACK, () => {
      console.log('[RendererIPC] Back');
      browserService.goBack();
    });

    ipcRenderer.on(IPC_CHANNELS.BROWSER_FORWARD, () => {
      console.log('[RendererIPC] Forward');
      browserService.goForward();
    });

    ipcRenderer.on(IPC_CHANNELS.BROWSER_RELOAD, () => {
      console.log('[RendererIPC] Reload');
      browserService.reload();
    });

    // State and screenshot requests
    ipcRenderer.on(IPC_CHANNELS.BROWSER_GET_STATE, async (event: IpcRendererEvent) => {
      const state = browserService.getState();
      const replyChannel = event.replyTo || IPC_CHANNELS.AGENT_BROWSER_RESPONSE;
      ipcRenderer.send(replyChannel, state);
    });

    ipcRenderer.on(IPC_CHANNELS.BROWSER_GET_SCREENSHOT, async (event: IpcRendererEvent) => {
      const screenshot = await browserService.takeScreenshot();
      const replyChannel = event.replyTo || IPC_CHANNELS.AGENT_SCREENSHOT_RESPONSE;
      ipcRenderer.send(replyChannel, screenshot);
    });

    ipcRenderer.on(IPC_CHANNELS.BROWSER_EXECUTE_SCRIPT, async (event: IpcRendererEvent, script: string) => {
      const result = await browserService.executeScript(script);
      const replyChannel = event.replyTo || IPC_CHANNELS.AGENT_BROWSER_RESPONSE;
      ipcRenderer.send(replyChannel, result);
    });

    // Forward browser events to main process
    browserService.on('browser-navigate', ({ url }: { url: string }) => {
      ipcRenderer.send(IPC_CHANNELS.BROWSER_NAVIGATED, { url, timestamp: Date.now() });
    });

    browserService.on('browser-state-change', ({ newState }: { newState: unknown }) => {
      ipcRenderer.send(IPC_CHANNELS.BROWSER_STATE_CHANGE, newState);
    });

    browserService.on('browser-ready', () => {
      ipcRenderer.send(IPC_CHANNELS.BROWSER_READY);
    });

    browserService.on('browser-error', ({ error, url }: { error: string; url: string }) => {
      ipcRenderer.send(IPC_CHANNELS.BROWSER_ERROR, { error, url, timestamp: Date.now() });
    });

    browserService.on('browser-event', (event: unknown) => {
      ipcRenderer.send(IPC_CHANNELS.BROWSER_EVENT, event);
    });

    console.log('[RendererIPC] Handlers registered');
  } catch (error) {
    console.error('[RendererIPC] Failed to setup:', error);
  }
}

/**
 * Initialize IPC in renderer process
 */
export function initializeRendererIPC(): void {
  if (typeof window !== 'undefined') {
    setupRendererIPC();
    console.log('[RendererIPC] Initialized');
  }
}
