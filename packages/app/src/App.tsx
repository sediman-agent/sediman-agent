import { useEffect, lazy, Suspense } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { useRPCConnection } from '@/hooks/useRPCConnection';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { initializeRendererIPC } from '@/services/browser';
import { Toaster } from 'sonner';

const AgentPage = lazy(() => import('@/components/pages/AgentPage').then(m => ({ default: m.AgentPage })));
const ProjectPage = lazy(() => import('@/components/pages/ProjectPage').then(m => ({ default: m.ProjectPage })));
const ModelsPage = lazy(() => import('@/components/pages/ModelsPage').then(m => ({ default: m.ModelsPage })));
const ProviderPage = lazy(() => import('@/components/pages/ProviderPage').then(m => ({ default: m.ProviderPage })));
const MemoryPage = lazy(() => import('@/components/pages/MemoryPage').then(m => ({ default: m.MemoryPage })));
const SessionsPage = lazy(() => import('@/components/pages/SessionsPage').then(m => ({ default: m.SessionsPage })));
const SkillsPage = lazy(() => import('@/components/pages/SkillsPage').then(m => ({ default: m.SkillsPage })));
const LogsPage = lazy(() => import('@/components/pages/LogsPage').then(m => ({ default: m.LogsPage })));
const SettingsPage = lazy(() => import('@/components/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full bg-background">
      <div className="w-5 h-5 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const currentPage = useAppStore((state) => state.currentPage);
  const theme = useAppStore((state) => state.theme);
  const colorTheme = useAppStore((state) => state.colorTheme);

  useRPCConnection();
  useKeyboardShortcuts();

  useEffect(() => {
    initializeRendererIPC();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.classList.remove('theme-blue', 'theme-purple', 'theme-green', 'theme-rose', 'theme-cyan');
    if (colorTheme !== 'default') {
      root.classList.add(`theme-${colorTheme}`);
    }
  }, [theme, colorTheme]);

  const renderPage = () => {
    switch (currentPage) {
      case 'agent':
        return <AgentPage />;
      case 'projects':
        return <ProjectPage />;
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
    <ErrorBoundary>
      <AppLayout>
        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </AppLayout>
      <Toaster position="bottom-right" richColors closeButton />
      <CommandPalette />
    </ErrorBoundary>
  );
}

export default App;
