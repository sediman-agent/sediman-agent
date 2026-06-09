import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, leftIcon, rightIcon, ...props }, ref) => {
    const inputId = React.useId();
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            type={type}
            className={cn(
              // Base styles
              'w-full px-3 py-2 text-sm rounded-md border transition-all duration-200',
              // Colors
              'bg-white border-gray-300 text-gray-900',
              'placeholder:text-gray-400',
              // Focus state
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500',
              // Error state
              hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-blue-500',
              // Disabled state
              'disabled:opacity-50 disabled:cursor-not-allowed',
              // Icon padding
              leftIcon ? 'pl-9' : '',
              rightIcon ? 'pr-9' : '',
              // File input
              'file:border-0 file:bg-transparent file:text-xs file:font-medium',
              className
            )}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` :
              helperText ? `${inputId}-helper` :
              undefined
            }
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-red-600 mt-1"
            role="alert"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="text-xs text-gray-500 mt-1"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
