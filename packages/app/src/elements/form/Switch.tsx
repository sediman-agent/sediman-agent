/**
 * Professional Switch Component
 * OpenCode-inspired toggle switch with smooth animations
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      label,
      description,
      size = 'md',
      disabled,
      ...props
    },
    ref
  ) => {
    const switchId = React.useId();

    const sizeClasses = {
      sm: {
        switch: 'w-9 h-5',
        thumb: 'w-4 h-4',
        translate: 'translate-x-4',
      },
      md: {
        switch: 'w-11 h-6',
        thumb: 'w-5 h-5',
        translate: 'translate-x-5',
      },
      lg: {
        switch: 'w-13 h-7',
        thumb: 'w-6 h-6',
        translate: 'translate-x-6',
      },
    };

    const currentSize = sizeClasses[size];

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <div className="relative inline-flex items-center">
            <input
              id={switchId}
              ref={ref}
              type="checkbox"
              disabled={disabled}
              className="peer sr-only"
              {...props}
            />

            {/* Switch track */}
            <div
              className={cn(
                // Base styles
                'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2',
                // Track styles
                'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                // Disabled state
                'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                // Size
                currentSize.switch,
                className
              )}
              style={{
                background: props.checked ? 'hsl(var(--primary))' : 'hsl(var(--input))',
              }}
            >
              {/* Switch thumb */}
              <div
                className={cn(
                  'pointer-events-none inline-block rounded-full ring-0 transition-transform duration-200 ease-in-out',
                  'translate-x-0 peer-checked:translate-x-5',
                  currentSize.thumb
                )}
                style={{
                  background: 'hsl(var(--background))',
                  transform: props.checked
                    ? `translateX(${size === 'sm' ? '16px' : size === 'md' ? '20px' : '24px'})`
                    : 'translateX(0)',
                }}
              />
            </div>
          </div>

          {(label || description) && (
            <div className="flex flex-col gap-0.5">
              {label && (
                <label
                  htmlFor={switchId}
                  className={cn(
                    'font-medium cursor-pointer transition-colors duration-150',
                    'select-none'
                  )}
                  style={{
                    color: disabled ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {label}
                </label>
              )}
              {description && (
                <p
                  className="text-sm"
                  style={{
                    color: disabled ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
