import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import styles from './Field.module.css';

interface FieldProps {
  readonly label: ReactNode;
  readonly error?: string;
  readonly hint?: ReactNode;
  readonly children: (props: {
    id: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
}

/** Подпись, контрол и ошибка с правильными aria-связями. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })}
      {(error || hint) && (
        <p id={messageId} className={cx(styles.message, error && styles.error)}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(styles.input, className)} {...rest} />;
}

/** Крупное поле суммы с цифровой клавиатурой на телефоне. */
export function MoneyInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={styles.moneyWrap}>
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        className={cx(styles.money, 'num', className)}
        {...rest}
      />
      <span className={styles.currency} aria-hidden>
        ₽
      </span>
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className={cx(styles.message, styles.error)}>
      {children}
    </p>
  );
}
