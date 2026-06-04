import { Sidebar } from './Sidebar';
import { useAppStore } from '@/stores/useAppStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={`
          flex-1 flex flex-col overflow-hidden transition-all duration-200 ease-out
          ${sidebarOpen ? 'ml-56' : 'ml-12'}
        `}
      >
        {children}
      </main>
    </div>
  );
}
