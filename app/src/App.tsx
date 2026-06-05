import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { AgentPage } from '@/components/pages/AgentPage';
import { ModelsPage } from '@/components/pages/ModelsPage';
import { ProviderPage } from '@/components/pages/ProviderPage';
import { MemoryPage } from '@/components/pages/MemoryPage';
import { SessionsPage } from '@/components/pages/SessionsPage';
import { SkillsPage } from '@/components/pages/SkillsPage';
import { LogsPage } from '@/components/pages/LogsPage';
import { SettingsPage } from '@/components/pages/SettingsPage';
import { SandboxPanel } from '@/components/sandbox';
import { useRPCConnection } from '@/hooks/useRPCConnection';
import { initializeRendererIPC } from '@/services/browser';

function App() {
  const currentPage = useAppStore((state) => state.currentPage);
  const theme = useAppStore((state) => state.theme);
  const colorTheme = useAppStore((state) => state.colorTheme);

  // Establish RPC connection on app load
  useRPCConnection();

  // Initialize browser IPC for agent-browser communication
  useEffect(() => {
    initializeRendererIPC();
    console.log('[OpenSkynet] App initialized with Browser IPC');
  }, []);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const root = document.documentElement;

    // Apply dark/light mode
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply color theme
    root.classList.remove('theme-blue', 'theme-purple', 'theme-green', 'theme-rose', 'theme-cyan');
    if (colorTheme !== 'default') {
      root.classList.add(`theme-${colorTheme}`);
    }

    console.log('[OpenSkynet] Theme applied:', theme, colorTheme);
  }, [theme, colorTheme]);

  // Initialize theme from store on first render
  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = useAppStore.getState().theme;
    const storedColorTheme = useAppStore.getState().colorTheme;

    // Only apply if different from current state to prevent flicker
    const hasDarkClass = root.classList.contains('dark');
    if (storedTheme === 'dark' && !hasDarkClass) {
      root.classList.add('dark');
    } else if (storedTheme === 'light' && hasDarkClass) {
      root.classList.remove('dark');
    }

    console.log('[OpenSkynet] Initial theme check:', { storedTheme, hasDarkClass });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'agent':
        return <AgentPage />;
      case 'models':
        return <ModelsPage />;
      case 'provider':
        return <ProviderPage />;
      case 'memory':
        return <MemoryPage />;
      case 'sessions':
        return <SessionsPage />;
      case 'skills':
        return <SkillsPage />;
      case 'logs':
        return <LogsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <AgentPage />;
    }
  };

  return (
    <AppLayout>
      {renderPage()}
      <SandboxPanel />
    </AppLayout>
  );
}

export default App;
