import { Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';

export function SidebarStatus() {
  const agentStatus = useAppStore((state) => state.agentStatus);
  const isConnected = useAppStore((state) => state.isConnected);

  return (
    <div className="space-y-2">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <Circle
          className={cn(
            'h-2 w-2',
            isConnected
              ? 'fill-primary text-primary'
              : 'fill-destructive text-destructive'
          )}
        />
        <span className={cn(
          'text-xs font-medium',
          isConnected ? 'text-foreground' : 'text-destructive'
        )}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Agent status */}
      <div className="flex items-center gap-2">
        {agentStatus.state === 'running' ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
            <span className="text-xs font-medium">Running</span>
          </>
        ) : (
          <>
            <Circle
              className={cn(
                'h-2 w-2',
                agentStatus.state === 'idle'
                  ? 'fill-success text-success'
                  : 'fill-destructive text-destructive'
              )}
            />
            <span className={cn(
              'text-xs font-medium capitalize',
              agentStatus.state === 'idle' ? 'text-foreground' : 'text-destructive'
            )}>
              {agentStatus.state}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
