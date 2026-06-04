import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { SidebarNav } from './SidebarNav';
import { SidebarAgent } from './SidebarAgent';
import { SidebarStatus } from './SidebarStatus';
import { Button } from '@/components/shared/Button';

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-50',
        'bg-background',
        'border-r border-border',
        'transition-all duration-200 ease-out',
        sidebarOpen ? 'w-56' : 'w-12'
      )}
    >
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-2 border-b border-border">
        {sidebarOpen && (
          <span className="text-sm font-medium text-foreground px-1">OpenSkynet</span>
        )}
        <div className={cn('flex items-center gap-0', !sidebarOpen && 'mx-auto')}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-6 w-6 shrink-0 p-0 rounded"
          >
            {theme === 'dark' ? (
              <Sun className="w-3 h-3" />
            ) : (
              <Moon className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-6 w-6 shrink-0 p-0 rounded"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {sidebarOpen && (
        <>
          <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {/* Navigation */}
            <div className="px-2">
              <SidebarNav />
            </div>

            {/* Divider */}
            <div className="mx-4 my-2 h-px bg-border" />

            {/* Agent History */}
            <div className="px-2">
              <SidebarAgent />
            </div>
          </nav>

          {/* Status */}
          <div className="p-2 border-t border-border">
            <SidebarStatus />
          </div>
        </>
      )}

      {/* Collapsed state - minimal letter badges */}
      {!sidebarOpen && (
        <nav className="flex-1 flex flex-col items-center py-2 gap-0.5">
          <CollapsedNavItem label="C" page="agent" />
          <CollapsedNavItem label="M" page="models" />
          <CollapsedNavItem label="P" page="provider" />
          <CollapsedNavItem label="M" page="memory" />
          <CollapsedNavItem label="S" page="sessions" />
          <CollapsedNavItem label="S" page="skills" />
          <CollapsedNavItem label="L" page="logs" />
          <CollapsedNavItem label="⌘" page="settings" />
        </nav>
      )}
    </aside>
  );
}

function CollapsedNavItem({
  label,
  page,
}: {
  label: string;
  page: string;
}) {
  const currentPage = useAppStore((state) => state.currentPage);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const isActive = currentPage === page;

  return (
    <button
      onClick={() => setCurrentPage(page as any)}
      className={cn(
        'w-8 h-8 rounded flex items-center justify-center text-sm font-medium',
        'transition-colors duration-150',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent'
      )}
      title={page.charAt(0).toUpperCase() + page.slice(1)}
    >
      {label}
    </button>
  );
}
