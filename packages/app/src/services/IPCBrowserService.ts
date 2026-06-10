/**
 * IPC Browser Service (Renderer Process)
 * Communicates with Playwright service in main process via IPC
 * This avoids "process is not defined" errors in renderer
 */

export interface BrowserCommand {
  id: string;
  action: string;
  params: Record<string, any>;
  timestamp: number;
}

export interface CommandResult {
  success: boolean;
  result?: any;
  error?: string;
}

class IPCBrowserService {
  private isInitialized = false;
  private isInitializing = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pendingResults: Map<string, CommandResult> = new Map();

  /**
   * Initialize IPC connection to Playwright service in main process
   */
  async initialize(webviewElement?: any): Promise<void> {
    if (this.isInitialized) {
      console.log('[IPCBrowser] Already initialized');
      return;
    }

    if (this.isInitializing) {
      console.log('[IPCBrowser] Already initializing');
      return;
    }

    try {
      this.isInitializing = true;
      console.log('[IPCBrowser] Initializing IPC connection...');

      // Initialize Playwright service in main process
      if (window.electron && window.electron.ipcRenderer) {
        const initResult = await window.electron.ipcRenderer.invoke('playwright-init');
        if (initResult.success) {
          console.log('[IPCBrowser] Playwright service initialized in main process');
          this.isInitialized = true;
          console.log('[IPCBrowser] ✓ Initialization complete');

          // Start polling for commands
          this.startCommandPolling();

          // Listen for navigation events to sync webview
          window.electron.ipcRenderer.on('playwright-navigated', (event: any, data: { url: string }) => {
            if (webviewElement && data.url) {
              console.log('[IPCBrowser] Syncing webview to:', data.url);
              webviewElement.src = data.url;
            }
          });
        } else {
          console.error('[IPCBrowser] Failed to initialize Playwright service:', initResult.error);
          throw new Error(initResult.error);
        }
      } else {
        console.error('[IPCBrowser] Electron IPC not available');
        throw new Error('Electron IPC not available');
      }
    } catch (error) {
      console.error('[IPCBrowser] Initialization failed:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Start polling for browser commands from backend
   */
  private startCommandPolling(): void {
    if (this.pollingInterval) return;

    console.log('[IPCBrowser] Starting command polling...');
    this.pollingInterval = setInterval(async () => {
      if (!this.isInitialized) return;

      try {
        const response = await fetch('http://localhost:3001/api/browser/pending-commands');
        if (response.ok) {
          const data = await response.json();
          if (data.commands && data.commands.length > 0) {
            console.log('[IPCBrowser] Received', data.commands.length, 'commands');
            await this.executeCommands(data.commands);
          }
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 500);
  }

  /**
   * Execute browser commands via IPC (main process uses Playwright)
   */
  private async executeCommands(commands: BrowserCommand[]): Promise<void> {
    for (const command of commands) {
      try {
        console.log('[IPCBrowser] Executing:', command.action, command.params);

        // Send command to main process via IPC
        if (window.electron && window.electron.ipcRenderer) {
          const result = await window.electron.ipcRenderer.invoke('playwright-exec', command);

          console.log('[IPCBrowser] Command result:', result.success ? 'SUCCESS' : 'FAILED');

          // Send result back to backend
          await this.sendCommandResult(command.id, result);
        } else {
          throw new Error('Electron IPC not available');
        }
      } catch (error) {
        console.error('[IPCBrowser] Command execution error:', error);
        const errorResult: CommandResult = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
        await this.sendCommandResult(command.id, errorResult);
      }
    }
  }

  /**
   * Send command result back to backend
   */
  private async sendCommandResult(commandId: string, result: CommandResult): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/browser/exec/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId,
          result: result.result,
          error: result.error
        })
      });

      if (response.ok) {
        console.log('[IPCBrowser] Result sent for command:', commandId);
      } else {
        console.error('[IPCBrowser] Failed to send result:', response.status);
      }
    } catch (err) {
      console.error('[IPCBrowser] Error sending result:', err);
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl(): Promise<string> {
    if (window.electron && window.electron.ipcRenderer) {
      const info = await window.electron.ipcRenderer.invoke('playwright-get-page-info');
      return info.url || '';
    }
    return '';
  }

  /**
   * Get current page title
   */
  async getCurrentTitle(): Promise<string> {
    if (window.electron && window.electron.ipcRenderer) {
      const info = await window.electron.ipcRenderer.invoke('playwright-get-page-info');
      return info.title || '';
    }
    return '';
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (window.electron && window.electron.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('playwright-cleanup');
    }

    this.isInitialized = false;
    console.log('[IPCBrowser] Cleaned up');
  }
}

// Singleton instance
export const ipcBrowserService = new IPCBrowserService();

// Type declaration for global window object
declare global {
  interface Window {
    ipcBrowserService?: typeof ipcBrowserService;
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
      };
    };
  }
}

// Make available globally for easy access
if (typeof window !== 'undefined') {
  window.ipcBrowserService = ipcBrowserService;
}
