import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, AgentStatus, Notification } from '@/types';

interface AppState extends AppSettings {
  agentStatus: AgentStatus;
  notifications: Notification[];
  sidebarOpen: boolean;
  currentPage: 'agent' | 'projects' | 'models' | 'provider' | 'memory' | 'sessions' | 'skills' | 'logs' | 'settings';
  colorTheme: 'default' | 'blue' | 'purple' | 'green' | 'rose' | 'cyan';
  model: string;
  provider: string;

  setAgentStatus: (status: Partial<AgentStatus>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: AppState['currentPage']) => void;
  toggleTheme: () => void;
  setColorTheme: (theme: AppState['colorTheme']) => void;
  setModel: (model: string) => void;
  setProvider: (provider: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiBaseUrl: 'http://localhost:3001',
      autoConnect: true,
      theme: 'dark',
      model: '',
      provider: '',
      agentStatus: {
        state: 'idle',
        rpcConnected: false,
        browserConnected: false,
      },
      notifications: [],
      sidebarOpen: true,
      currentPage: 'agent',
      colorTheme: 'default',

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

        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      setColorTheme: (theme) => {
        set({ colorTheme: theme });

        document.documentElement.classList.remove(
          'theme-blue',
          'theme-purple',
          'theme-green',
          'theme-rose',
          'theme-cyan'
        );

        if (theme !== 'default') {
          document.documentElement.classList.add(`theme-${theme}`);
        }
      },

      setModel: (model: string) => {
        console.log('Setting model:', model);
        set({ model });
      },

      setProvider: (provider: string) => {
        console.log('Setting provider:', provider);
        set({ provider });
      },
    }),
    {
      name: 'openskynet-app-store',
      partialize: (state) => ({
        apiBaseUrl: state.apiBaseUrl,
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
