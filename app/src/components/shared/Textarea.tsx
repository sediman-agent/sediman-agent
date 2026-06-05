import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Enable auto-resize using CSS field-sizing
   * @default true
   */
  autoResize?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      autoResize = true,
      label,
      error,
      helperText,
      maxLength,
      showCharacterCount = false,
      size = 'md',
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = React.useId();
    const hasError = !!error;
    const characterCount = typeof value === 'string' ? value.length : 0;
    const isNearLimit = maxLength && characterCount >= maxLength * 0.9;
    const isAtLimit = maxLength && characterCount >= maxLength;

    const sizeClasses = {
      sm: 'text-sm py-2 px-3 min-h-[80px]',
      md: 'text-sm py-2.5 px-3 min-h-[120px]',
      lg: 'text-base py-3 px-4 min-h-[160px]',
    };

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={textareaId}
              className="text-sm font-medium"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {label}
            </label>
            {showCharacterCount && maxLength && (
              <span
                className={cn(
                  'text-xs',
                  isAtLimit
                    ? 'text-destructive font-medium'
                    : isNearLimit
                      ? 'text-warning'
                      : ''
                )}
                style={{ color: isAtLimit ? 'hsl(var(--destructive))' : isNearLimit ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground))' }}
              >
                {characterCount}/{maxLength}
              </span>
            )}
          </div>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          className={cn(
            // Base styles
            'flex w-full rounded-md border transition-all duration-200',
            // Size
            sizeClasses[size],
            // Auto resize
            autoResize && 'textarea-autoresize',
            !autoResize && 'resize-y',
            className
          )}
          style={{
            background: 'hsl(var(--background))',
            border: hasError ? '1px solid hsl(var(--destructive))' : '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
          aria-invalid={hasError}
          aria-describedby={
            hasError
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          {...props}
        />

        {error && (
          <p
            id={`${textareaId}-error`}
            className="text-xs mt-1"
            style={{ color: 'hsl(var(--destructive))' }}
            role="alert"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={`${textareaId}-helper`}
            className="text-xs mt-1"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
