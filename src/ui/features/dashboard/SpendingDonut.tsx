import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { CategorySlice } from '@/application';
import { formatMoney, type Kopecks } from '@/domain';
import { Card } from '@/ui/shared/components/Card';
import { EmptyState } from '@/ui/shared/components/States';
import { categoryColorVar } from '@/ui/shared/category-visuals';
import { cx } from '@/ui/shared/lib/cx';
import styles from './SpendingDonut.module.css';

const percent = (share: number) => `${Math.round(share * 100)}%`;

export function SpendingDonut({
  slices,
  total,
}: {
  slices: readonly CategorySlice[];
  total: Kopecks;
}) {
  const [active, setActive] = useState<number | null>(null);
  const focused = active === null ? null : slices[active];

  return (
    <Card title="Куда ушли деньги" subtitle="Расходы месяца по категориям">
      {slices.length === 0 ? (
        <EmptyState
          compact
          illustration={<ShoppingBag size={30} />}
          title="Пока без расходов"
          text="Когда появятся траты, здесь будет видно, на что уходят деньги."
        />
      ) : (
        <div className={styles.layout}>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices as CategorySlice[]}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="70%"
                  outerRadius="100%"
                  paddingAngle={0}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive
                  onMouseEnter={(_, index) => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                >
                  {slices.map((slice, index) => (
                    <Cell
                      key={slice.key}
                      fill={categoryColorVar(slice.color)}
                      opacity={active === null || active === index ? 1 : 0.35}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.center} aria-live="polite">
              <span className={styles.centerLabel}>{focused ? focused.name : 'Всего'}</span>
              <span className={cx(styles.centerValue, 'num')}>
                {formatMoney(focused ? focused.amount : total)}
              </span>
              {focused && <span className={styles.centerLabel}>{percent(focused.share)}</span>}
            </div>
          </div>

          <ul className={styles.list}>
            {slices.map((slice, index) => (
              <li
                key={slice.key}
                className={cx(styles.row, active !== null && active !== index && styles.dimmed)}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              >
                <span
                  className={styles.swatch}
                  style={{ background: categoryColorVar(slice.color) }}
                  aria-hidden
                />
                <span className={styles.name}>{slice.name}</span>
                <span className={cx(styles.amount, 'num')}>{formatMoney(slice.amount)}</span>
                <span className={cx(styles.share, 'num')}>{percent(slice.share)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
