/**
 * Professional Progress Component
 * OpenCode-inspired progress indicators with smooth animations
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  indeterminate?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      size = 'md',
      variant = 'default',
      showLabel = false,
      label,
      indeterminate = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    };

    const variantClasses = {
      default: 'bg-blue-600',
      success: 'bg-green-600',
      warning: 'bg-orange-500',
      error: 'bg-red-600',
    };

    const trackColor = {
      default: 'bg-gray-200',
      success: 'bg-green-100',
      warning: 'bg-orange-100',
      error: 'bg-red-100',
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-2 w-full', className)}
        {...props}
      >
        {(showLabel || label) && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{label}</span>
            {showLabel && (
              <span className="text-gray-500">{Math.round(percentage)}%</span>
            )}
          </div>
        )}

        <div
          className={cn(
            'relative w-full rounded-full overflow-hidden',
            sizeClasses[size],
            trackColor[variant]
          )}
        >
          <div
            className={cn(
              'absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out',
              variantClasses[variant],
              indeterminate && 'animate-progress-indeterminate'
            )}
            style={{
              width: indeterminate ? '100%' : `${percentage}%`,
            }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };

/**
 * Circular Progress Component
 */
export interface CircularProgressProps {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function CircularProgress({
  value = 0,
  max = 100,
  size = 40,
  strokeWidth = 3,
  variant = 'default',
  showLabel = false,
  label,
  className,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: 'stroke-blue-600',
    success: 'stroke-green-600',
    warning: 'stroke-orange-500',
    error: 'stroke-red-600',
  };

  const trackColors = {
    default: 'stroke-gray-200',
    success: 'stroke-green-100',
    warning: 'stroke-orange-100',
    error: 'stroke-red-100',
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={trackColors[variant]}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={cn(
              variantColors[variant],
              'transition-all duration-300 ease-out'
            )}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>

        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-700">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>

      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
    </div>
  );
}

/**
 * Spinner Component (indeterminate loading)
 */
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export function Spinner({
  size = 'md',
  variant = 'primary',
  className,
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const variantClasses = {
    default: 'text-gray-400',
    primary: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-orange-500',
    error: 'text-red-600',
  };

  return (
    <div
      className={cn(
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}
