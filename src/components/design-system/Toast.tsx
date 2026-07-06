import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

export type ToastVariant = 'success' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type ToastContextValue = {
  addToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  removeToast: (id: string) => void;
};

// ── Context ────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Hook ──────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

// ── Single toast visual ───────────────────────────────────

const variantBorderClasses: Record<ToastVariant, string> = {
  success: 'border-l-status-accepted',
  info: 'border-l-secondary',
  warning: 'border-l-status-pending',
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(() => setVisible(false), item.duration - 300);
    const remove = setTimeout(onDismiss, item.duration);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, [item.duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'flex items-start gap-3 bg-surface border border-border-soft rounded-lg px-4 py-3',
        'border-l-4 shadow-modal min-w-64 max-w-80',
        'transition-all duration-300 ease-in-out',
        variantBorderClasses[item.variant],
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4',
      ].join(' ')}
    >
      <p className="flex-1 font-sans text-sm text-text-primary leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="shrink-0 text-text-secondary hover:text-text-primary transition-colors duration-120 mt-0.5"
        aria-label="Dismiss notification"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

// ── Toaster container ─────────────────────────────────────

function Toaster({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-toast flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard item={t} onDismiss={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000) => {
      counterRef.current += 1;
      const id = `toast-${counterRef.current}`;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <Toaster toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}
