import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import styles from './Sheet.module.css';

interface SheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: ReactNode;
  readonly children: ReactNode;
}

/**
 * Нижний лист на телефоне и модальное окно на десктопе. Построен на нативном <dialog>:
 * фокус-ловушка, Esc и инертный фон достаются от браузера. Содержимое монтируется
 * только в открытом состоянии — каждая форма начинается с чистого листа.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // autoFocus React срабатывает до showModal и теряется — фокусируем нужное поле сами.
      dialog.querySelector<HTMLElement>('[data-autofocus="true"]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Клик по подложке (сам <dialog>, а не его содержимое) закрывает лист.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.panel}>
          <div className={styles.grabber} aria-hidden />
          <header className={styles.header}>
            <h2 id={titleId}>{title}</h2>
            <IconButton label="Закрыть" onClick={onClose}>
              <X size={20} />
            </IconButton>
          </header>
          <div className={styles.body}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
