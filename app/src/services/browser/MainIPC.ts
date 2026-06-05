/**
 * Main Process IPC Handlers
 * Handles IPC communication in the main process (Electron main)
 * NOTE: This file is for the main process only
 */

import { IPC_CHANNELS } from './IPCChannels';

interface IpcMainEvent {
  sender: {
    send: (channel: string, ...args: unknown[]) => void;
  };
}

/**
 * Setup IPC handlers for main process
 * Call this in the Electron main process
 */
export function setupMainIPC(): void {
  if (typeof window !== 'undefined') {
    console.warn('[MainIPC] Should only be called in main process');
    return;
  }

  try {
    const { ipcMain } = require('electron');

    // Browser control commands
    ipcMain.on('browser-control-navigate', (event: IpcMainEvent, url: string) => {
      event.sender.send(IPC_CHANNELS.BROWSER_NAVIGATE, url);
    });

    ipcMain.on('browser-control-back', (event: IpcMainEvent) => {
      event.sender.send(IPC_CHANNELS.BROWSER_BACK);
    });

    ipcMain.on('browser-control-forward', (event: IpcMainEvent) => {
      event.sender.send(IPC_CHANNELS.BROWSER_FORWARD);
    });

    ipcMain.on('browser-control-reload', (event: IpcMainEvent) => {
      event.sender.send(IPC_CHANNELS.BROWSER_RELOAD);
    });

    // Forward browser events to agent listeners
    ipcMain.on(IPC_CHANNELS.BROWSER_EVENT, (event: IpcMainEvent, browserEvent: unknown) => {
      event.sender.send('agent-browser-event', browserEvent);
    });

    ipcMain.on(IPC_CHANNELS.BROWSER_NAVIGATED, (event: IpcMainEvent, data: unknown) => {
      event.sender.send('agent-browser-navigated', data);
    });

    ipcMain.on(IPC_CHANNELS.BROWSER_READY, (event: IpcMainEvent) => {
      event.sender.send('agent-browser-ready');
    });

    ipcMain.on(IPC_CHANNELS.BROWSER_ERROR, (event: IpcMainEvent, data: unknown) => {
      event.sender.send('agent-browser-error', data);
    });

    console.log('[MainIPC] Handlers registered');
  } catch (error) {
    console.error('[MainIPC] Failed to setup:', error);
  }
}

/**
 * Browser Controller for main process
 * Allows main process to control browser via IPC
 */
export class BrowserController {
  private mainWindow: any;

  constructor(mainWindow: any) {
    this.mainWindow = mainWindow;
  }

  private ensureAvailable() {
    if (!this.mainWindow) {
      throw new Error('Main window not available');
    }
  }

  async navigate(url: string): Promise<void> {
    this.ensureAvailable();
    this.mainWindow.webContents.send(IPC_CHANNELS.BROWSER_NAVIGATE, url);
  }

  async back(): Promise<void> {
    this.ensureAvailable();
    this.mainWindow.webContents.send(IPC_CHANNELS.BROWSER_BACK);
  }

  async forward(): Promise<void> {
    this.ensureAvailable();
    this.mainWindow.webContents.send(IPC_CHANNELS.BROWSER_FORWARD);
  }

  async reload(): Promise<void> {
    this.ensureAvailable();
    this.mainWindow.webContents.send(IPC_CHANNELS.BROWSER_RELOAD);
  }

  async getState(): Promise<any> {
    return this.sendRequest(IPC_CHANNELS.BROWSER_GET_STATE, 'state', 5000);
  }

  async screenshot(): Promise<string | null> {
    return this.sendRequest(IPC_CHANNELS.BROWSER_GET_SCREENSHOT, 'screenshot', 10000);
  }

  async executeScript<T = any>(script: string): Promise<T | null> {
    const response = await this.sendRequest(IPC_CHANNELS.BROWSER_EXECUTE_SCRIPT, 'script', 5000, script);
    return response as T | null;
  }

  async waitForReady(timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ensureAvailable();

      const timeoutId = setTimeout(() => {
        this.mainWindow.removeListener('browser-ready', handler);
        reject(new Error('Browser ready timeout'));
      }, timeout);

      const handler = () => {
        clearTimeout(timeoutId);
        this.mainWindow.removeListener('browser-ready', handler);
        resolve();
      };

      this.mainWindow.on('browser-ready', handler);
    });
  }

  private sendRequest(channel: string, type: string, timeout: number, ...args: any[]): Promise<any> {
    this.ensureAvailable();

    return new Promise((resolve, reject) => {
      const responseChannel = `${type}-response-${Date.now()}`;
      const timeoutId = setTimeout(() => {
        this.mainWindow.removeListener(responseChannel, handler);
        reject(new Error(`${type} request timeout`));
      }, timeout);

      const handler = (_: unknown, result: unknown) => {
        clearTimeout(timeoutId);
        resolve(result);
      };

      this.mainWindow.once(responseChannel, handler);
      this.mainWindow.send(channel, { replyTo: responseChannel }, ...args);
    });
  }
}
