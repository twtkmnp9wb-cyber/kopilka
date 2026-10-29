import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';
import styles from './Chip.module.css';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly selected?: boolean;
  readonly icon?: ReactNode;
}

export function Chip({ selected, icon, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(styles.chip, selected && styles.selected, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
