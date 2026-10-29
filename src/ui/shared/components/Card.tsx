import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';
import styles from './Card.module.css';

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly action?: ReactNode;
  readonly padded?: boolean;
  readonly as?: 'section' | 'article' | 'div';
}

export function Card({
  title,
  subtitle,
  action,
  padded = true,
  as: Tag = 'section',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag className={cx(styles.card, padded && styles.padded, className)} {...rest}>
      {(title || action) && (
        <header className={styles.header}>
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </Tag>
  );
}
