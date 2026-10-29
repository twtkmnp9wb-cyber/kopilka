import { formatMoney, type BudgetPlan } from '@/domain';
import { CategoryBadge } from '@/ui/shared/category-visuals';
import { Card } from '@/ui/shared/components/Card';
import { ProgressBar } from '@/ui/shared/components/Progress';
import { cx } from '@/ui/shared/lib/cx';
import styles from './CategoryBudgets.module.css';

/** Лимиты по необязательным категориям: потрачено / рекомендовано. */
export function CategoryBudgets({ plan }: { plan: BudgetPlan }) {
  const spentTotal = plan.discretionarySpent;
  const limitTotal = Math.max(plan.free, 0);
  return (
    <Card
      title="Бюджет по категориям"
      subtitle={`Потрачено ${formatMoney(spentTotal)} из ${formatMoney(limitTotal)} свободного лимита`}
    >
      {plan.categories.length === 0 ? (
        <p className={styles.empty}>Нет необязательных категорий расходов.</p>
      ) : (
        <ul className={styles.list}>
          {plan.categories.map(({ category, limit, spent, ratio }) => {
            const over = spent - limit;
            const tone = ratio > 1 ? 'danger' : ratio > 0.85 ? 'warning' : 'accent';
            return (
              <li key={category.id} className={styles.row}>
                <CategoryBadge icon={category.icon} color={category.color} size={36} />
                <div className={styles.body}>
                  <div className={styles.head}>
                    <span className={styles.name}>{category.name}</span>
                    <span className={cx(styles.numbers, 'num')}>
                      {formatMoney(spent)} <span className={styles.of}>/ {formatMoney(limit)}</span>
                    </span>
                  </div>
                  <ProgressBar
                    value={limit > 0 ? spent / limit : spent > 0 ? 1 : 0}
                    tone={tone}
                    thin
                    label={`${category.name}: потрачено ${formatMoney(spent)} из ${formatMoney(limit)}`}
                  />
                  {over > 0 && (
                    <span className={styles.over}>+{formatMoney(over)} сверх лимита</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
