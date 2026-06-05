/**
 * Professional Checkbox Component
 * OpenCode-inspired checkbox with proper accessibility
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      error,
      size = 'md',
      indeterminate = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const checkboxRef = React.useRef<HTMLInputElement>(null);
    const inputRef = ref || checkboxRef;

    React.useEffect(() => {
      if (checkboxRef.current && indeterminate) {
        checkboxRef.current.indeterminate = true;
      }
    }, [indeterminate]);

    const checkboxId = React.useId();
    const hasError = !!error;

    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const iconSizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4',
    };

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <div className="relative flex items-start mt-0.5">
            <input
              id={checkboxId}
              ref={inputRef}
              type="checkbox"
              disabled={disabled}
              className={cn(
                // Base styles
                'peer appearance-none rounded border transition-all duration-200',
                // Colors
                'border-gray-300 bg-white',
                'checked:bg-blue-600 checked:border-blue-600',
                'hover:border-gray-400',
                // Focus state
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                // Error state
                hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                // Disabled state
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
                // Size
                sizeClasses[size],
                className
              )}
              aria-invalid={hasError}
              {...props}
            />

            {/* Custom checkmark icon */}
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-200',
                'text-white opacity-0 peer-checked:opacity-100'
              )}
            >
              <Check className={iconSizeClasses[size]} />
            </div>
          </div>

          {(label || description) && (
            <div className="flex flex-col gap-0.5">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    'font-medium cursor-pointer transition-colors duration-150',
                    disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900',
                    'select-none'
                  )}
                >
                  {label}
                </label>
              )}
              {description && (
                <p
                  className={cn(
                    'text-sm',
                    disabled ? 'text-gray-400' : 'text-gray-500'
                  )}
                >
                  {description}
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p
            className="text-xs text-red-600 mt-1"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
