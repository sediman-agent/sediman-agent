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
  togglePanel: () => void;
  setOpen: (open: boolean) => void;
  setControlMode: (mode: ControlMode) => void;
  setIsActive: (active: boolean) => void;
  setError: (error: string | null) => void;
}

const initialState: SandboxState = {
  isOpen: true, // Start with panel open for browser agent testing
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

    // Panel actions - auto-activate when opening
    togglePanel: () => set((state) => {
      const newOpen = !state.isOpen;
      return {
        isOpen: newOpen,
        isActive: newOpen ? true : false,
        connectionStatus: newOpen ? 'connecting' : 'disconnected'
      };
    }),

    setOpen: (open) => set({
      isOpen: open,
      isActive: open,
      connectionStatus: open ? 'connecting' : 'disconnected'
    }),

    setControlMode: (mode) => set({ controlMode: mode }),
    setIsActive: (active) => set({ isActive: active }),

    setError: (error) => set({ error }),
  })
);
