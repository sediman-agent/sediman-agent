import {
  MessageSquare,
  FolderOpen,
  Bot,
  Server,
  Database,
  History,
  Package,
  FileText,
  Settings,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { useSandboxStore } from '@/stores/useSandboxStore';

const navItems = [
  { id: 'agent' as const, label: 'Chat', icon: MessageSquare },
  { id: 'projects' as const, label: 'Projects', icon: FolderOpen },
  { id: 'models' as const, label: 'Models', icon: Bot },
  { id: 'provider' as const, label: 'Provider', icon: Server },
  { id: 'memory' as const, label: 'Memory', icon: Database },
  { id: 'sessions' as const, label: 'Sessions', icon: History },
  { id: 'skills' as const, label: 'Skills', icon: Package },
  { id: 'logs' as const, label: 'Logs', icon: FileText },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const currentPage = useAppStore((state) => state.currentPage);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const togglePanel = useSandboxStore((state) => state.togglePanel);
  const isPanelOpen = useSandboxStore((state) => state.isOpen);

  return (
    <div className="space-y-0">
      {navItems.map((item) => {
        const isActive = currentPage === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id as any)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-xs',
              'transition-colors duration-150',
              'border-l-2',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* Browser Panel Button */}
      <button
        onClick={togglePanel}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-xs',
          'transition-colors duration-150',
          'border-l-2',
          isPanelOpen
            ? 'border-primary text-foreground bg-primary/5'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
        )}
        aria-label="Open browser panel"
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span>Browser</span>
      </button>
    </div>
  );
}
