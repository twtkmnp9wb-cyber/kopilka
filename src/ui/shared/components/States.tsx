import type { CSSProperties, ReactNode } from 'react';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { cx } from '../lib/cx';
import { Button } from './Button';
import styles from './States.module.css';

export function Skeleton({
  height = 16,
  width = '100%',
  radius,
}: {
  height?: number;
  width?: number | string;
  radius?: number;
}) {
  return (
    <span
      aria-hidden
      className={styles.skeleton}
      style={{ height, width, borderRadius: radius } as CSSProperties}
    />
  );
}

/** Каркас страницы, пока грузятся данные. */
export function PageSkeleton() {
  return (
    <div className={styles.pageSkeleton} aria-busy="true" aria-label="Загрузка">
      <Skeleton height={168} radius={20} />
      <div className={styles.row}>
        <Skeleton height={96} radius={20} />
        <Skeleton height={96} radius={20} />
        <Skeleton height={96} radius={20} />
      </div>
      <Skeleton height={260} radius={20} />
    </div>
  );
}

interface EmptyStateProps {
  readonly illustration: ReactNode;
  readonly title: string;
  readonly text?: ReactNode;
  readonly action?: ReactNode;
  readonly compact?: boolean;
}

export function EmptyState({ illustration, title, text, action, compact }: EmptyStateProps) {
  return (
    <div className={cx(styles.empty, compact && styles.compact)}>
      <div className={styles.illustration} aria-hidden>
        {illustration}
      </div>
      <h2>{title}</h2>
      {text && <p className={styles.text}>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Не удалось загрузить данные';
  return (
    <div className={styles.empty} role="alert">
      <div className={cx(styles.illustration, styles.errorIcon)} aria-hidden>
        <TriangleAlert size={28} />
      </div>
      <h2>Не получилось загрузить</h2>
      <p className={styles.text}>{message}</p>
      {onRetry && (
        <Button variant="secondary" icon={<RotateCw size={16} />} onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}
