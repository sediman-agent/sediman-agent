import { create } from 'zustand';

export type SandboxType = 'browser' | 'computer';
export type ControlMode = 'agent' | 'user' | 'shared';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SandboxSession {
  id: string;
  type: SandboxType;
  startedAt: number;
  controlMode: ControlMode;
}

interface SandboxState {
  // Panel state
  isOpen: boolean;

  // Sandbox state
  isActive: boolean;
  sandboxType: SandboxType;
  controlMode: ControlMode;
  connectionStatus: ConnectionStatus;
  currentSession: SandboxSession | null;

  // Streaming
  isStreaming: boolean;
  lastScreenshot: string | null;
  streamError: string | null;

  // Loading states
  isStarting: boolean;
  isStopping: boolean;

  // Error handling
  error: string | null;
}

interface SandboxActions {
  // Panel actions
  togglePanel: () => void;
  setOpen: (open: boolean) => void;

  // Sandbox control
  startSandbox: (type: SandboxType) => void;
  stopSandbox: () => void;
  setControlMode: (mode: ControlMode) => void;
  setSandboxType: (type: SandboxType) => void;
  setIsActive: (active: boolean) => void;

  // Connection state
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSession: (session: SandboxSession | null) => void;

  // Streaming
  setStreaming: (streaming: boolean) => void;
  setScreenshot: (screenshot: string | null) => void;
  setStreamError: (error: string | null) => void;

  // Loading states
  setStarting: (starting: boolean) => void;
  setStopping: (stopping: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

const initialState: SandboxState = {
  isOpen: false,
  isActive: false,
  sandboxType: 'browser',
  controlMode: 'agent',
  connectionStatus: 'disconnected',
  currentSession: null,
  isStreaming: false,
  lastScreenshot: null,
  streamError: null,
  isStarting: false,
  isStopping: false,
  error: null,
};

export const useSandboxStore = create<SandboxState & SandboxActions>()(
  (set) => ({
    ...initialState,

    // Panel actions
    togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (open) => set({ isOpen: open }),

    // Sandbox control
    startSandbox: (type) =>
      set({
        sandboxType: type,
        isActive: true,
        controlMode: 'agent',
        connectionStatus: 'connecting',
        isStarting: true,
        error: null,
      }),

    stopSandbox: () =>
      set({
        isActive: false,
        isStopping: true,
        connectionStatus: 'disconnected',
        currentSession: null,
        isStreaming: false,
        lastScreenshot: null,
      }),

    setControlMode: (mode) => set({ controlMode: mode }),
    setSandboxType: (type) => set({ sandboxType: type }),
    setIsActive: (active) => set({ isActive: active }),

    // Connection state
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setSession: (session) => set({ currentSession: session }),

    // Streaming
    setStreaming: (streaming) => set({ isStreaming: streaming }),
    setScreenshot: (screenshot) => set({ lastScreenshot: screenshot }),
    setStreamError: (error) => set({ streamError: error }),

    // Loading states
    setStarting: (starting) => set({ isStarting: starting }),
    setStopping: (stopping) => set({ isStopping: stopping }),

    // Error handling
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Reset
    reset: () => set(initialState),
  })
);
