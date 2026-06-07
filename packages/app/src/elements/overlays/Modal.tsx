import { cn } from '@/lib/utils';
import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/elements/actions/Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  footer,
}: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      const previouslyFocused = document.activeElement as HTMLElement;

      setTimeout(() => {
        const focusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 50);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        previouslyFocused?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full max-h-full',
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[1040] animate-in fade-in"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-0 z-[1050] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        <div
          ref={modalRef}
          className={cn(
            'rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto',
            'animate-in fade-in zoom-in duration-200',
            'bg-card text-card-foreground border border-border',
            sizeClasses[size]
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 id="modal-title" className="text-lg font-semibold text-foreground">{title}</h3>
                {description && (
                  <p id="modal-description" className="text-sm mt-1 text-muted-foreground">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}

          <div className="px-6 py-4">
            {children}
          </div>

          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
