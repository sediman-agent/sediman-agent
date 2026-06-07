import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  MessageSquare,
  FolderOpen,
  Bot,
  Server,
  Database,
  History,
  Package,
  FileText,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { SidebarNav } from './SidebarNav';
import { SidebarAgent } from './SidebarAgent';
import { SidebarStatus } from './SidebarStatus';
import { Button } from '@/elements/actions/Button';

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] bg-primary text-primary-foreground px-4 py-2 rounded">
        Skip to main content
      </a>
      <aside
        className={cn(
          'h-full flex flex-col',
          'transition-all duration-200 ease-out',
          'bg-background text-foreground border-r border-border',
          sidebarOpen ? 'w-56' : 'w-12'
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="h-10 flex items-center justify-between px-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            {sidebarOpen && (
              <span className="text-sm font-medium whitespace-nowrap">
                OpenSkynet
              </span>
            )}
          </div>
          <div className={cn('flex items-center gap-1', !sidebarOpen && 'mx-auto')}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-6 w-6 shrink-0 p-0 rounded"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-3 h-3 text-foreground" />
              ) : (
                <Moon className="w-3 h-3 text-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-6 w-6 shrink-0 p-0 rounded"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-3 h-3 text-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-foreground" />
              )}
            </Button>
          </div>
        </div>

        {sidebarOpen && (
          <>
            <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin" aria-label="Page navigation">
              <div className="px-2">
                <SidebarNav />
              </div>

              <div className="mx-4 my-2 h-px bg-border" />

              <div className="px-2">
                <SidebarAgent />
              </div>
            </nav>

            <div className="flex items-center p-2 border-t border-border min-h-[38px] flex-shrink-0">
              <SidebarStatus />
            </div>
          </>
        )}

        {!sidebarOpen && (
          <nav className="flex-1 flex flex-col items-center py-2 gap-0.5" aria-label="Page navigation (collapsed)">
            <CollapsedNavItem icon={MessageSquare} label="Chat" page="agent" />
            <CollapsedNavItem icon={FolderOpen} label="Projects" page="projects" />
            <CollapsedNavItem icon={Bot} label="Models" page="models" />
            <CollapsedNavItem icon={Server} label="Provider" page="provider" />
            <CollapsedNavItem icon={Database} label="Memory" page="memory" />
            <CollapsedNavItem icon={History} label="Sessions" page="sessions" />
            <CollapsedNavItem icon={Package} label="Skills" page="skills" />
            <CollapsedNavItem icon={FileText} label="Logs" page="logs" />
            <CollapsedNavItem icon={Settings} label="Settings" page="settings" />
          </nav>
        )}
      </aside>
    </>
  );
}

interface CollapsedNavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  page: string;
}

function CollapsedNavItem({ icon: Icon, label, page }: CollapsedNavItemProps) {
  const currentPage = useAppStore((state) => state.currentPage);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const isActive = currentPage === page;

  return (
    <button
      onClick={() => setCurrentPage(page as any)}
      className={cn(
        'w-8 h-8 rounded flex items-center justify-center',
        'transition-colors duration-150',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
      title={label}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
