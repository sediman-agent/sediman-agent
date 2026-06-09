import { cn } from '@/lib/utils';

interface ContextWindowProps {
  used: number;
  max: number;
  showLabel?: boolean;
  className?: string;
}

export function ContextWindow({ used, max, showLabel = true, className }: ContextWindowProps) {
  const percentage = Math.min((used / max) * 100, 100);

  const getColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-blue-500';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Circular indicator */}
      <div className="relative w-4 h-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 16 16">
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted opacity-20"
          />
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${percentage * 0.081} 100`}
            className={getColor(percentage)}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {Math.round(percentage)}%
        </span>
      )}

      {/* Tooltip */}
      <div className="group relative">
        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-background border border-border rounded p-2 text-xs shadow-lg z-50">
          <div className="font-medium mb-1">Context Window</div>
          <div className="text-muted-foreground">
            {used.toLocaleString()} / {max.toLocaleString()} tokens
          </div>
        </div>
      </div>
    </div>
  );
}
