import { useMemo } from 'react';
import { buildMonthOverview } from '@/application';
import { ErrorState, PageSkeleton } from '@/ui/shared/components/States';
import { useSnapshot } from '@/ui/shared/data/queries';
import { usePeriod } from '@/ui/shared/period';
import { AllowanceCard } from './AllowanceCard';
import { IncomeExpenseChart } from './IncomeExpenseChart';
import { NearestGoalCard } from './NearestGoalCard';
import { SpendingDonut } from './SpendingDonut';
import { StatTiles } from './StatTiles';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { snapshot, isPending, error, retry } = useSnapshot();
  const { month, today } = usePeriod();
  const overview = useMemo(
    () => (snapshot ? buildMonthOverview(snapshot, month, today) : null),
    [snapshot, month, today],
  );

  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (isPending || !overview) return <PageSkeleton />;

  return (
    <div className={styles.grid}>
      <div className={styles.hero}>
        <AllowanceCard overview={overview} />
      </div>
      <div className={styles.goal}>
        <NearestGoalCard progress={overview.nearestGoal} />
      </div>
      <div className={styles.tiles}>
        <StatTiles overview={overview} />
      </div>
      <div className={styles.bars}>
        <IncomeExpenseChart history={overview.history} />
      </div>
      <div className={styles.donut}>
        <SpendingDonut slices={overview.spending} total={overview.spendingTotal} />
      </div>
    </div>
  );
}
