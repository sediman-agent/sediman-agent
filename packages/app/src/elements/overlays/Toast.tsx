import * as React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

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

const toastIcons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors: Record<ToastType, string> = {
  success: 'hsl(var(--success))',
  error: 'hsl(var(--error))',
  warning: 'hsl(var(--warning))',
  info: 'hsl(var(--info))',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
    [dismiss]
  );

  const clear = React.useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, clear }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[1070] flex flex-col gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.type];
          const color = toastColors[toast.type];

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 w-80 rounded-lg shadow-lg p-4 animate-in slide-in-from-right bg-card border border-border"
              role="alert"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <div className="flex-shrink-0 mt-0.5" style={{ color }}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && (
                  <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                )}
                <p className="text-sm text-foreground">{toast.message}</p>
              </div>

              <button
                onClick={() => dismiss(toast.id)}
                className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
