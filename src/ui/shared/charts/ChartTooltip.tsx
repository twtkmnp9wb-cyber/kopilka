import type { ReactNode } from 'react';
import styles from './charts.module.css';

export interface TooltipRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  /** Цвет метки-образца рядом с подписью (текст всегда в цветах текста). */
  readonly swatch?: string;
  readonly dashed?: boolean;
}

export function ChartTooltipCard({
  title,
  rows,
  footer,
}: {
  title: ReactNode;
  rows: readonly TooltipRow[];
  footer?: ReactNode;
}) {
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{title}</div>
      {rows.map((row) => (
        <div key={row.key} className={styles.tooltipRow}>
          {row.swatch && (
            <span
              className={row.dashed ? styles.swatchDashed : styles.swatch}
              style={{ ['--swatch' as string]: row.swatch }}
              aria-hidden
            />
          )}
          <span className={styles.tooltipLabel}>{row.label}</span>
          <span className={`${styles.tooltipValue} num`}>{row.value}</span>
        </div>
      ))}
      {footer && <div className={styles.tooltipFooter}>{footer}</div>}
    </div>
  );
}

export function Legend({
  items,
}: {
  items: ReadonlyArray<{ key: string; label: string; color: string; dashed?: boolean }>;
}) {
  return (
    <ul className={styles.legend}>
      {items.map((item) => (
        <li key={item.key}>
          <span
            className={item.dashed ? styles.swatchDashed : styles.swatch}
            style={{ ['--swatch' as string]: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
