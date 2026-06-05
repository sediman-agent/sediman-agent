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
    <div className="space-y-0" style={{ fontFamily: 'inherit' }}>
      {navItems.map((item) => {
        const isActive = currentPage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id as any)}
            className={cn(
              'w-full flex items-center px-3 py-2 text-xs',
              'transition-colors duration-150',
              'border-l-2',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
            style={{
              fontFamily: 'inherit',
              cursor: 'pointer'
            }}
          >
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
