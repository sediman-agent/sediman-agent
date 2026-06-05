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

/**
 * Status Badge - specialized badge for status indicators
 */
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

/**
 * Count Badge - for notification counts
 */
export interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  showZero?: boolean;
  className?: string;
}

export function CountBadge({
  count,
  max = 99,
  variant = 'error',
  showZero = false,
  className,
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  if (!showZero && count === 0) {
    return null;
  }

  const variantColors = {
    default: 'hsl(var(--muted))',
    primary: 'hsl(var(--primary))',
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
    error: 'hsl(var(--error))',
  };

  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center justify-center',
        'min-w-[1.25rem] h-5 px-1.5',
        'text-xs font-semibold',
        'rounded-full',
        'transition-all duration-200',
        className
      )}
      style={{
        background: variantColors[variant],
        color: 'hsl(var(--background))',
      }}
    >
      {displayCount}
    </span>
  );
}

/**
 * Pill Badge - rectangular badge for categories/tags
 */
export interface PillBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export function PillBadge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: PillBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div
      className={cn(
        // Base styles
        'inline-flex items-center rounded-md font-medium transition-colors duration-150',
        // Size
        sizeClasses[size],
        className
      )}
      style={{
        background: `hsl(var(--badge-${variant === 'default' ? 'primary' : variant}))`,
        color: `hsl(var(--badge-${variant === 'default' ? 'foreground' : variant + '-foreground'}))`,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
