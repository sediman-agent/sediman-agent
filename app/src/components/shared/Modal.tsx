/**
 * Professional Modal/Dialog Component
 * Clean backdrop design with smooth animations
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

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
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1040] animate-in fade-in"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
        <div
          className={`
            rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto
            animate-in fade-in zoom-in duration-200
            ${sizeClasses[size]}
          `}
          style={{ background: 'hsl(var(--card))' }}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{title}</h3>
                {description && (
                  <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{description}</p>
                )}
              </div>
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
                </Button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Professional Toast Notification System
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback(
    ({ id, type, title, message, duration = 5000 }: Omit<Toast, 'id'> & { id?: string }) => {
      const newToast: Toast = {
        id: id || crypto.randomUUID(),
        type,
        title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(newToast.id);
        }, duration);
      }
    },
    []
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = React.useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, clear }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[1070] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 w-80 rounded-lg shadow-lg p-4 animate-in slide-in-from-right animate-out fade-out duration-200"
            style={{
              background: 'hsl(var(--card))',
              borderLeft: '4px solid',
              borderLeftColor: toast.type === 'success'
                ? 'hsl(var(--success))'
                : toast.type === 'error'
                ? 'hsl(var(--error))'
                : toast.type === 'warning'
                ? 'hsl(var(--warning))'
                : 'hsl(var(--info))'
            }}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--success))' }}>
                  <svg
                    className="w-3 h-3"
                    style={{ color: 'hsl(var(--background))' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4" />
                  </svg>
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--error))' }}>
                  <svg
                    className="w-3 h-3"
                    style={{ color: 'hsl(var(--background))' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
              )}
              {toast.type === 'warning' && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--warning))' }}>
                  <svg
                    className="w-3 h-3"
                    style={{ color: 'hsl(var(--background))' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <line x1="12" y1="9" x2="12" y2="15" />
                    <line x1="12" y1="9" x2="12" y2="9" />
                  </svg>
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--info))' }}>
                  <svg
                    className="w-3 h-3"
                    style={{ color: 'hsl(var(--background))' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1">
              {toast.title && (
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{toast.title}</p>
              )}
              <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{toast.message}</p>
            </div>

            <button
              onClick={() => dismiss(toast.id)}
              className="ml-4 transition-colors"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
