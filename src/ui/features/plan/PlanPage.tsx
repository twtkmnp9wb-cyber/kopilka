import { useEffect, useMemo, useRef, useState } from 'react';
import { buildForecast, buildPlan } from '@/application';
import { SETTINGS_LIMITS } from '@/domain';
import { ErrorState, PageSkeleton } from '@/ui/shared/components/States';
import { queryKeys, useFinanceMutation, useSnapshot } from '@/ui/shared/data/queries';
import { usePeriod } from '@/ui/shared/period';
import { CategoryBudgets } from './CategoryBudgets';
import { ForecastChart } from './ForecastChart';
import { IncomeWaterfall } from './IncomeWaterfall';
import { PlanWarnings } from './PlanWarnings';
import styles from './PlanPage.module.css';

export default function PlanPage() {
  const { snapshot, isPending, error, retry } = useSnapshot();
  const { month, today } = usePeriod();
  const [horizon, setHorizon] = useState<number | null>(null);
  const saveSettings = useFinanceMutation(
    (useCases, forecastMonths: number) =>
      useCases.settings.save({ ...(snapshot?.settings ?? { cushionPercent: 10 }), forecastMonths }),
    [queryKeys.settings],
  );

  const effectiveHorizon = horizon ?? snapshot?.settings.forecastMonths ?? 12;

  // Горизонт запоминается в настройках, но не на каждый шаг слайдера.
  const saveRef = useRef(saveSettings.mutate);
  saveRef.current = saveSettings.mutate;
  useEffect(() => {
    if (horizon === null || horizon === snapshot?.settings.forecastMonths) return;
    const timer = window.setTimeout(() => saveRef.current(horizon), 700);
    return () => window.clearTimeout(timer);
  }, [horizon, snapshot?.settings.forecastMonths]);

  const plan = useMemo(() => (snapshot ? buildPlan(snapshot, month) : null), [snapshot, month]);
  const projection = useMemo(
    () => (snapshot ? buildForecast(snapshot, today, effectiveHorizon) : null),
    [snapshot, today, effectiveHorizon],
  );

  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (isPending || !plan || !projection || !snapshot) return <PageSkeleton />;

  return (
    <div className={styles.grid}>
      <div className={styles.full}>
        <PlanWarnings plan={plan} />
      </div>
      <IncomeWaterfall plan={plan} />
      <CategoryBudgets plan={plan} />
      <div className={styles.full}>
        <ForecastChart
          forecast={projection.forecast}
          goals={snapshot.goals}
          horizon={effectiveHorizon}
          limits={SETTINGS_LIMITS.forecastMonths}
          onHorizonChange={setHorizon}
        />
      </div>
    </div>
  );
}
