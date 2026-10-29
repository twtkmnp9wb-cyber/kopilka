import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { cx } from '../lib/cx';
import styles from './Toast.module.css';

export interface ToastOptions {
  readonly message: string;
  readonly tone?: 'neutral' | 'success' | 'error';
  readonly action?: { readonly label: string; readonly onClick: () => void };
  readonly durationMs?: number;
}

interface ToastItem extends ToastOptions {
  readonly id: number;
}

interface ToastApi {
  show(options: ToastOptions): void;
  error(error: unknown): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const messageOf = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'Что-то пошло не так';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = (nextId.current += 1);
      // Не больше трёх одновременно: старые уходят первыми.
      setItems((current) => [...current.slice(-2), { ...options, id }]);
      window.setTimeout(() => dismiss(id), options.durationMs ?? (options.action ? 6000 : 3500));
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ show, error: (error) => show({ message: messageOf(error), tone: 'error' }) }),
    [show],
  );

  return (
    <ToastContext value={api}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={cx(styles.toast, item.tone === 'error' && styles.error)}>
            {item.tone === 'error' ? (
              <CircleAlert size={18} aria-hidden />
            ) : item.tone === 'success' ? (
              <CircleCheck size={18} aria-hidden />
            ) : null}
            <span className={styles.message}>{item.message}</span>
            {item.action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
              >
                {item.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const context = use(ToastContext);
  if (!context) throw new Error('useToast вне ToastProvider');
  return context;
}
