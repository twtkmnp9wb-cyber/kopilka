import { TriangleAlert } from 'lucide-react';
import { formatMoney, formatMonth, monthOf, type BudgetPlan } from '@/domain';
import styles from './PlanWarnings.module.css';

/** Предупреждения, когда план не сходится: взносы в цели не помещаются в доход. */
export function PlanWarnings({ plan }: { plan: BudgetPlan }) {
  if (plan.shortfall <= 0) return null;
  return (
    <div className={styles.stack}>
      <div className={styles.card} role="alert">
        <TriangleAlert size={20} aria-hidden className={styles.icon} />
        <div>
          <p className={styles.title}>Доходов не хватает на план: −{formatMoney(plan.shortfall)}</p>
          <p className={styles.text}>
            Обязательные платежи, взносы в цели и подушка больше ожидаемого дохода. Можно сдвинуть
            сроки целей, уменьшить подушку в настройках или найти дополнительный доход.
          </p>
        </div>
      </div>
      {plan.suggestions.map(({ progress, realisticMonth }) => (
        <div key={progress.goal.id} className={styles.card}>
          <span className={styles.emoji} aria-hidden>
            {progress.goal.emoji}
          </span>
          <div>
            <p className={styles.title}>
              {realisticMonth
                ? `«${progress.goal.name}» реально накопить к: ${formatMonth(realisticMonth)}`
                : `«${progress.goal.name}» при нынешнем бюджете не накопить`}
            </p>
            <p className={styles.text}>
              Сейчас срок — {formatMonth(monthOf(progress.goal.deadline))}, нужно{' '}
              {formatMoney(progress.monthlyRequired)} в месяц. Перенеси срок в карточке цели, чтобы
              план сошёлся.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
