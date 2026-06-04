import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';

const navItems = [
  { id: 'agent' as const, label: 'Chat' },
  { id: 'models' as const, label: 'Models' },
  { id: 'provider' as const, label: 'Provider' },
  { id: 'memory' as const, label: 'Memory' },
  { id: 'sessions' as const, label: 'Sessions' },
  { id: 'skills' as const, label: 'Skills' },
  { id: 'logs' as const, label: 'Logs' },
  { id: 'settings' as const, label: 'Settings' },
];

export function SidebarNav() {
  const currentPage = useAppStore((state) => state.currentPage);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);

  return (
    <div className="space-y-0.5">
      {navItems.map((item) => {
        const isActive = currentPage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id as any)}
            className={cn(
              'w-full flex items-center px-2 py-1 rounded',
              'text-xs font-normal',
              'transition-colors duration-150',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
