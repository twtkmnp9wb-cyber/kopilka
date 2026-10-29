import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { MonthOverview } from '@/application';
import { formatMoney, type Kopecks, type MonthTotals } from '@/domain';
import { Sparkline } from '@/ui/shared/charts/Sparkline';
import { cx } from '@/ui/shared/lib/cx';
import styles from './StatTiles.module.css';

interface TileSpec {
  readonly key: keyof MonthTotals;
  readonly label: string;
  readonly color: string;
  /** Рост — это хорошо? Для расходов — нет. */
  readonly upIsGood: boolean;
}

const TILES: readonly TileSpec[] = [
  { key: 'income', label: 'Доход', color: 'var(--income)', upIsGood: true },
  { key: 'expense', label: 'Расход', color: 'var(--expense)', upIsGood: false },
  { key: 'saved', label: 'Отложено', color: 'var(--saving)', upIsGood: true },
];

function Delta({
  current,
  previous,
  upIsGood,
}: {
  current: Kopecks;
  previous: Kopecks;
  upIsGood: boolean;
}) {
  if (previous <= 0 || current === previous)
    return <span className={styles.deltaMuted}>к прошлому месяцу —</span>;
  const change = (current - previous) / previous;
  const up = change > 0;
  const good = up === upIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cx(styles.delta, good ? styles.good : styles.bad)}>
      <Icon size={14} aria-hidden />
      <span className="num">{Math.abs(Math.round(change * 100))}%</span>
      <span className={styles.deltaMuted}>к прошлому месяцу</span>
    </span>
  );
}

export function StatTiles({ overview }: { overview: MonthOverview }) {
  return (
    <div className={styles.tiles}>
      {TILES.map((tile) => (
        <article key={tile.key} className={styles.tile}>
          <p className={styles.label}>
            <span className={styles.dot} style={{ background: tile.color }} aria-hidden />
            {tile.label}
          </p>
          <p className={cx(styles.value, 'num')}>
            {formatMoney(overview.totals[tile.key], {
              compact: overview.totals[tile.key] >= 100_000_00,
            })}
          </p>
          <Delta
            current={overview.totals[tile.key]}
            previous={overview.previous[tile.key]}
            upIsGood={tile.upIsGood}
          />
          <div className={styles.spark}>
            <Sparkline
              values={overview.history.map((point) => point[tile.key])}
              color={tile.color}
              label={`${tile.label} за полгода`}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
