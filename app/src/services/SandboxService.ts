import type {
  SandboxSession,
  SandboxStatus,
  InputEvent,
  StreamCallback,
} from '@/types/sandbox';
import type { SandboxType } from '@/stores/useSandboxStore';
import { getRPCClient } from '@/services/rpcClient';
import { createServiceContainer } from './index';

export interface SandboxService {
  // Session management
  start: (type: SandboxType) => Promise<SandboxSession>;
  stop: () => Promise<void>;
  getStatus: () => Promise<SandboxStatus>;

  // Control
  sendInput: (event: InputEvent) => Promise<void>;
  setControlMode: (mode: 'agent' | 'user' | 'shared') => Promise<void>;

  // Diagnostics
  testBrowser: () => Promise<any>;

  // Streaming
  subscribeToStream: (callbacks: StreamCallback) => () => void;
  unsubscribe: () => void;
}

export class RPCSandboxService implements SandboxService {

  constructor() {
    // Use singleton RPC client
  }

  async start(type: 'browser' | 'computer'): Promise<SandboxSession> {
    try {
      const rpc = getRPCClient();
      // Use 60 second timeout for browser startup (can be slow on first launch)
      const result = await rpc.call('sandbox.start', { type }, 60000) as any;

      // Check for backend error
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.session) {
        throw new Error('Failed to start sandbox session');
      }

      return result.session as SandboxSession;
    } catch (error) {
      console.error('Failed to start sandbox:', error);
      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('Browser startup timed out. This may happen on first launch. Please try again.');
        }
        if (error.message.includes('Not connected')) {
          throw new Error('Backend server not running. Please start the Python backend.');
        }
        if (error.message.includes('Computer sandbox not yet implemented')) {
          throw new Error('Computer sandbox is not yet implemented. Please use Browser sandbox for now.');
        }
        throw error;
      }
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      const rpc = getRPCClient();
      await rpc.call('sandbox.stop', {});
      this.unsubscribe();
    } catch (error) {
      console.error('Failed to stop sandbox:', error);
      throw error;
    }
  }

  async getStatus(): Promise<SandboxStatus> {
    try {
      const rpc = getRPCClient();
      const result = await rpc.call('sandbox.status', {}) as any;
      return result as SandboxStatus;
    } catch (error) {
      console.error('Failed to get sandbox status:', error);
      throw error;
    }
  }

  async sendInput(event: InputEvent): Promise<void> {
    try {
      const rpc = getRPCClient();
      await rpc.call('sandbox.control', { event });
    } catch (error) {
      console.error('Failed to send input:', error);
      throw error;
    }
  }

  async setControlMode(mode: 'agent' | 'user' | 'shared'): Promise<void> {
    try {
      const rpc = getRPCClient();
      await rpc.call('sandbox.set_mode', { mode });
    } catch (error) {
      console.error('Failed to set control mode:', error);
      throw error;
    }
  }

  async testBrowser(): Promise<any> {
    try {
      const rpc = getRPCClient();
      // Use 120 second timeout for browser test (can be slow on first launch)
      const result = await rpc.call('sandbox.test_browser', {}, 120000);
      return result;
    } catch (error) {
      console.error('Failed to test browser:', error);
      throw error;
    }
  }

  subscribeToStream(callbacks: StreamCallback): () => void {
    // Use polling instead of WebSocket since viewport endpoint requires separate API server
    let pollInterval: number | null = null;
    let lastScreenshot: string | null = null;

    const pollScreenshots = async () => {
      try {
        const rpc = getRPCClient();
        const result = await rpc.call<{ screenshot: string | null; error?: string }>(
          'sandbox.screenshot',
          {}
        );

        console.log('[SandboxService] Screenshot result:', {
          hasScreenshot: !!result.screenshot,
          screenshotLength: result.screenshot?.length,
          error: result.error
        });

        if (result.screenshot && result.screenshot !== lastScreenshot) {
          lastScreenshot = result.screenshot;
          callbacks.onScreenshot?.({
            type: 'screenshot',
            data: result.screenshot,
            timestamp: Date.now() / 1000
          });
          console.log('[SandboxService] Screenshot updated, length:', result.screenshot.length);
        }

        callbacks.onStatusChange?.('connected');
      } catch (error) {
        console.error('[SandboxService] Failed to poll screenshot:', error);
        callbacks.onError?.('Failed to get screenshot');
        callbacks.onStatusChange?.('error');
      }
    };

    // Start polling
    // Don't set status to 'connecting' since StreamCallback doesn't accept it
    pollScreenshots(); // Initial call
    pollInterval = window.setInterval(pollScreenshots, 500); // Poll every 500ms

    // Return unsubscribe function
    return () => {
      if (pollInterval !== null) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  }

  unsubscribe(): void {
    // Polling is cleaned up by the returned unsubscribe function
  }
}

export function createSandboxService(): SandboxService {
  return new RPCSandboxService();
}

// Global diagnostic function for browser console
if (typeof window !== 'undefined') {
  (window as any).sandboxDiagnostics = async () => {
    try {
      const rpc = getRPCClient();
      const services = createServiceContainer(rpc);

      console.log('=== Sandbox Diagnostics ===');
      console.log('RPC Client:', rpc.getDiagnostics());

      console.log('Testing browser startup...');
      const result = await services.sandbox.testBrowser();
      console.log('Browser Test Result:', result);

      return result;
    } catch (error) {
      console.error('Diagnostic failed:', error);
      throw error;
    }
  };

  (window as any).testScreenshot = async () => {
    try {
      const rpc = getRPCClient();
      console.log('Testing screenshot RPC call...');
      const result = await rpc.call<{ screenshot: string | null; error?: string }>(
        'sandbox.screenshot',
        {}
      );
      console.log('Screenshot result:', result);
      console.log('Has screenshot:', !!result.screenshot);
      console.log('Screenshot length:', result.screenshot?.length);
      console.log('Error:', result.error);
      return result;
    } catch (error) {
      console.error('Test screenshot failed:', error);
      throw error;
    }
  };

  (window as any).testStart = async () => {
    try {
      const rpc = getRPCClient();
      console.log('Testing sandbox.start RPC call...');
      const result = await rpc.call('sandbox.start', { type: 'browser' });
      console.log('Start result:', result);
      return result;
    } catch (error) {
      console.error('Test start failed:', error);
      throw error;
    }
  };

  (window as any).checkStore = () => {
    // Check the sandbox store state
    const store = require('@/stores/useSandboxStore').useSandboxStore.getState();
    console.log('Sandbox Store State:', {
      isActive: store.isActive,
      isStarting: store.isStarting,
      lastScreenshot: store.lastScreenshot?.substring(0, 100),
      screenshotLength: store.lastScreenshot?.length,
      isStreaming: store.isStreaming,
      connectionStatus: store.connectionStatus,
      error: store.error
    });
    return store;
  };

  (window as any).downloadScreenshot = () => {
    const store = require('@/stores/useSandboxStore').useSandboxStore.getState();
    if (store.lastScreenshot) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${store.lastScreenshot}`;
      link.download = 'browser-screenshot.png';
      link.click();
      console.log('Screenshot downloaded from store!');
    } else {
      console.log('No screenshot in store');
    }
  };
}
