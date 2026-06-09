/**
 * Professional Badge Component
 * OpenCode-inspired badges for status indicators and labels
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      removable = false,
      onRemove,
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'text-xs px-2 py-0.5 gap-1',
      md: 'text-sm px-2.5 py-1 gap-1.5',
      lg: 'text-base px-3 py-1.5 gap-2',
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center rounded-full border font-medium transition-all duration-200',
          // Hover effect for removable badges
          removable && 'pr-1.5',
          // Size
          sizeClasses[size],
          className
        )}
        style={{
          background: `hsl(var(--badge-${variant === 'default' ? 'primary' : variant}))`,
          color: `hsl(var(--badge-${variant === 'default' ? 'foreground' : variant + '-foreground'}))`,
          borderColor: 'hsl(var(--border))',
        }}
        {...props}
      >
        {dot && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: variant === 'default'
                ? 'hsl(var(--muted-foreground))'
                : `hsl(var(--${variant}))`,
            }}
          />
        )}
        <span>{children}</span>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-0.5 transition-colors"
            style={{ background: 'transparent' }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };

export interface StatusBadgeProps {
  status: 'online' | 'offline' | 'away' | 'busy' | 'error';
  label?: string;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const statusConfig = {
    online: {
      variant: 'success' as const,
      defaultLabel: 'Online',
      dotColor: 'hsl(var(--success))',
    },
    offline: {
      variant: 'default' as const,
      defaultLabel: 'Offline',
      dotColor: 'hsl(var(--muted-foreground))',
    },
    away: {
      variant: 'warning' as const,
      defaultLabel: 'Away',
      dotColor: 'hsl(var(--warning))',
    },
    busy: {
      variant: 'error' as const,
      defaultLabel: 'Busy',
      dotColor: 'hsl(var(--error))',
    },
    error: {
      variant: 'error' as const,
      defaultLabel: 'Error',
      dotColor: 'hsl(var(--error))',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 text-sm',
        className
      )}
      style={{ color: 'hsl(var(--foreground))' }}
    >
      {showDot && (
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: config.dotColor }}
        />
      )}
      <span>{label || config.defaultLabel}</span>
    </div>
  );
}
