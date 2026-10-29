import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../lib/cx';
import styles from './Progress.module.css';

export type ProgressTone = 'accent' | 'good' | 'warning' | 'danger' | 'income' | 'expense';

const toneVar: Record<ProgressTone, string> = {
  accent: 'var(--accent)',
  good: 'var(--good)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  income: 'var(--income)',
  expense: 'var(--expense)',
};

interface ProgressBarProps {
  /** 0…1, значения больше 1 обрезаются. */
  readonly value: number;
  readonly tone?: ProgressTone;
  readonly color?: string;
  readonly label: string;
  readonly thin?: boolean;
}

/**
 * Полоса прогресса: трек — светлая ступень того же цвета,
 * чтобы состояние читалось по всей ширине, а не только по заливке.
 */
export function ProgressBar({ value, tone = 'accent', color, label, thin }: ProgressBarProps) {
  const fill = color ?? toneVar[tone];
  const ratio = Math.min(Math.max(value, 0), 1);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className={cx(styles.track, thin && styles.thin)}
      style={{ '--fill': fill } as CSSProperties}
    >
      <div className={styles.bar} style={{ transform: `scaleX(${ratio})` }} />
    </div>
  );
}

interface ProgressRingProps {
  readonly value: number;
  readonly size?: number;
  readonly stroke?: number;
  readonly color?: string;
  readonly label: string;
  readonly children?: ReactNode;
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  color = 'var(--saving)',
  label,
  children,
}: ProgressRingProps) {
  const ratio = Math.min(Math.max(value, 0), 1);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className={styles.ring}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`color-mix(in srgb, ${color} 18%, transparent)`}
          strokeWidth={stroke}
        />
        <circle
          className={styles.ringValue}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <div className={styles.ringContent}>{children}</div>}
    </div>
  );
}
