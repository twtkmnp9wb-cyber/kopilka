import { formatMoney, type BudgetPlan, type IncomeSource } from '@/domain';
import { Card } from '@/ui/shared/components/Card';
import { cx } from '@/ui/shared/lib/cx';
import styles from './IncomeWaterfall.module.css';

const INCOME_SOURCE: Record<IncomeSource, string> = {
  recurring: 'по регулярным доходам',
  history: 'среднее за прошлые месяцы',
  actual: 'по фактическим поступлениям',
  none: 'доходов пока нет',
};

/**
 * «Водопад» месяца: одна полоса, поделённая на обязательные, цели, подушку и свободный лимит.
 * Сегменты разделены зазором цвета фона — без обводок.
 */
export function IncomeWaterfall({ plan }: { plan: BudgetPlan }) {
  const income = plan.income.expected;
  const segments = [
    {
      key: 'mandatory',
      label: 'Обязательные',
      amount: plan.mandatory.expected,
      color: 'var(--cat-blue)',
      hint: plan.mandatory.source === 'recurring' ? 'регулярные платежи' : 'по прошлым месяцам',
    },
    {
      key: 'goals',
      label: 'В цели',
      amount: plan.goalsAllocation,
      color: 'var(--saving)',
      hint: `${plan.goals.length} шт.`,
    },
    {
      key: 'cushion',
      label: 'Подушка',
      amount: plan.cushion,
      color: 'var(--cat-yellow)',
      hint: 'запас на непредвиденное',
    },
    {
      key: 'free',
      label: 'Свободно',
      amount: Math.max(plan.free, 0),
      color: 'var(--income)',
      hint: 'лимит на жизнь',
    },
  ];
  const total = Math.max(
    income,
    segments.reduce((sum, s) => sum + s.amount, 0),
    1,
  );

  return (
    <Card
      title="Куда распределится доход"
      subtitle={`Ожидаемый доход ${formatMoney(income)} · ${INCOME_SOURCE[plan.income.source]}`}
    >
      <div className={styles.bar} role="img" aria-label="Распределение дохода">
        {segments
          .filter((s) => s.amount > 0)
          .map((segment) => (
            <span
              key={segment.key}
              className={styles.segment}
              style={{ flexGrow: segment.amount / total, background: segment.color }}
              title={`${segment.label}: ${formatMoney(segment.amount)}`}
            />
          ))}
        {plan.shortfall > 0 && (
          <span
            className={cx(styles.segment, styles.shortfall)}
            style={{ flexGrow: plan.shortfall / total }}
            title={`Не хватает: ${formatMoney(plan.shortfall)}`}
          />
        )}
      </div>

      <ul className={styles.list}>
        {segments.map((segment) => (
          <li key={segment.key} className={styles.row}>
            <span className={styles.swatch} style={{ background: segment.color }} aria-hidden />
            <span className={styles.label}>
              {segment.label}
              <span className={styles.hint}>{segment.hint}</span>
            </span>
            <span className={cx(styles.amount, 'num')}>{formatMoney(segment.amount)}</span>
          </li>
        ))}
        {plan.shortfall > 0 && (
          <li className={cx(styles.row, styles.shortRow)}>
            <span className={cx(styles.swatch, styles.shortfall)} aria-hidden />
            <span className={styles.label}>Не хватает до плана</span>
            <span className={cx(styles.amount, 'num')}>−{formatMoney(plan.shortfall)}</span>
          </li>
        )}
      </ul>
    </Card>
  );
}
