import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, AgentStatus, Notification } from '@/types';

interface AppState extends AppSettings {
  // State
  isConnected: boolean;
  agentStatus: AgentStatus;
  notifications: Notification[];
  sidebarOpen: boolean;
  currentPage: 'agent' | 'models' | 'provider' | 'memory' | 'sessions' | 'skills' | 'logs' | 'settings';
  colorTheme: 'default' | 'blue' | 'purple' | 'green' | 'rose' | 'cyan';

  // Actions
  setConnected: (connected: boolean) => void;
  setAgentStatus: (status: Partial<AgentStatus>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: AppState['currentPage']) => void;
  toggleTheme: () => void;
  setColorTheme: (theme: AppState['colorTheme']) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      rpcUrl: 'ws://localhost:8765',
      autoConnect: false, // Don't auto-connect to avoid RPC errors
      theme: 'dark',
      isConnected: false,
      agentStatus: {
        state: 'idle',
        rpcConnected: false,
        browserConnected: false,
      },
      notifications: [],
      sidebarOpen: true,
      currentPage: 'agent',
      colorTheme: 'default',

      // Actions
      setConnected: (connected) =>
        set({ isConnected: connected }),

      setAgentStatus: (status) =>
        set((state) => ({
          agentStatus: { ...state.agentStatus, ...status },
        })),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: crypto.randomUUID(),
              timestamp: new Date(),
            },
          ],
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      setSettings: (settings) =>
        set((state) => ({ ...state, ...settings })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setCurrentPage: (page) => set({ currentPage: page }),

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });

        // Apply theme to document
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      setColorTheme: (theme) => {
        set({ colorTheme: theme });

        // Remove all theme classes
        document.documentElement.classList.remove(
          'theme-blue',
          'theme-purple',
          'theme-green',
          'theme-rose',
          'theme-cyan'
        );

        // Add new theme class if not default
        if (theme !== 'default') {
          document.documentElement.classList.add(`theme-${theme}`);
        }
      },
    }),
    {
      name: 'openskynet-app-store',
      partialize: (state) => ({
        rpcUrl: state.rpcUrl,
        autoConnect: state.autoConnect,
        theme: state.theme,
        colorTheme: state.colorTheme,
        model: state.model,
        provider: state.provider,
        headless: state.headless,
        stealth: state.stealth,
      }),
    }
  )
);
