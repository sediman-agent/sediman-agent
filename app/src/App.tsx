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

function App() {
  const currentPage = useAppStore((state) => state.currentPage);

  useEffect(() => {
    console.log('[OpenSkynet] App initialized');
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

  return <AppLayout>{renderPage()}</AppLayout>;
}

export default App;
