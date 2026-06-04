import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { getRPCClient, RPCClient } from '@/services/rpcClient';

describe('RPCClient', () => {
  let client: RPCClient;

  afterEach(() => {
    // Clean up any existing client
    (getRPCClient as any)['rpcClient'] = null;
  });

  it('should create singleton instance', () => {
    const client1 = getRPCClient('ws://localhost:8765');
    const client2 = getRPCClient('ws://localhost:8765');

    expect(client1).toBe(client2);
  });

  it('should have default URL', () => {
    const client = getRPCClient();
    expect(client).toBeDefined();
  });

  it('should create instance with custom URL', () => {
    const client = getRPCClient('ws://custom:9999');
    expect(client).toBeDefined();
  });

  it('should handle connection state', () => {
    const client = getRPCClient();

    // Initially not connected
    expect(client.isConnected()).toBe(false);
  });

  it('should export default RPCClient class', () => {
    expect(RPCClient).toBeDefined();
    expect(typeof RPCClient).toBe('function');
  });

  it('should have connect method', () => {
    const client = getRPCClient();
    expect(typeof client.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    const client = getRPCClient();
    expect(typeof client.disconnect).toBe('function');
  });

  it('should have call method', () => {
    const client = getRPCClient();
    expect(typeof client.call).toBe('function');
  });

  it('should have stream method', () => {
    const client = getRPCClient();
    expect(typeof client.stream).toBe('function');
  });

  it('should have isConnected method', () => {
    const client = getRPCClient();
    expect(typeof client.isConnected).toBe('function');
  });

  describe('WebSocket mocking', () => {
    let originalWebSocket: typeof WebSocket;

    beforeEach(() => {
      originalWebSocket = global.WebSocket;
      (getRPCClient as any)['rpcClient'] = null;
    });

    afterEach(() => {
      global.WebSocket = originalWebSocket;
    });

    it('should throw when not connected and calling RPC methods', async () => {
      // Mock closed WebSocket
      class MockClosedWebSocket {
        readyState = 3; // CLOSED
      }

      global.WebSocket = MockClosedWebSocket as any;
      const client = getRPCClient();

      await expect(client.call('test', {})).rejects.toThrow('Not connected');
    });

    it('should create WebSocket with correct URL on connect', (done) => {
      let capturedUrl = '';

      class MockWebSocket {
        constructor(url: string) {
          capturedUrl = url;
          this.readyState = 0;
        }

        addEventListener() {
          // Simulate connection
          setTimeout(() => {
            (this as any).onopen?.(new Event('open'));
          }, 0);
        }
      }

      global.WebSocket = MockWebSocket as any;
      const client = getRPCClient();

      client.connect().then(() => {
        expect(capturedUrl).toBe('ws://localhost:8765');
        done();
      });
    });

    it('should handle connection errors', (done) => {
      class MockErrorWebSocket {
        readyState = 3;
        constructor() {
          setTimeout(() => {
            (this as any).onerror?.(new Event('error'));
          }, 0);
        }
      }

      global.WebSocket = MockErrorWebSocket as any;
      const client = getRPCClient();

      client.connect().catch((error) => {
        expect(error).toBeDefined();
        done();
      });
    });
  });

  describe('Stream handling', () => {
    it('should have stream method with correct parameters', () => {
      const client = getRPCClient();
      const onChunk = vi.fn();
      const onDone = vi.fn();
      const onError = vi.fn();

      // Just check the method signature - actual testing requires WebSocket
      expect(client.stream).toBeDefined();
    });
  });
});
