/**
 * Professional Select Component
 * OpenCode-inspired dropdown with proper accessibility
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder = 'Select...',
      size = 'md',
      fullWidth = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = React.useId();
    const hasError = !!error;

    const sizeClasses = {
      sm: 'h-8 text-sm px-2.5',
      md: 'h-9 text-sm px-3',
      lg: 'h-10 text-base px-3',
    };

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              // Base styles
              'w-full appearance-none rounded-md border transition-all duration-200',
              // Colors
              'bg-white border-gray-300 text-gray-900',
              'placeholder:text-gray-400',
              // Focus state
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500',
              // Error state
              hasError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'focus:border-blue-500',
              // Disabled state
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
              // Size
              sizeClasses[size],
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${selectId}-error`
                : helperText
                  ? `${selectId}-helper`
                  : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom dropdown icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {error && (
          <p
            id={`${selectId}-error`}
            className="text-xs text-red-600 mt-1"
            role="alert"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={`${selectId}-helper`}
            className="text-xs text-gray-500 mt-1"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
