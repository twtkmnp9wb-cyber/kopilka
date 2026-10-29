import { useId, useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { formatMoney, formatMonth, type Forecast, type Goal, type Kopecks } from '@/domain';
import { AXIS_TICK, formatAxisMoney } from '@/ui/shared/charts/axis';
import { ChartTooltipCard, Legend } from '@/ui/shared/charts/ChartTooltip';
import { Card } from '@/ui/shared/components/Card';
import { cx } from '@/ui/shared/lib/cx';
import styles from './ForecastChart.module.css';

const LINE = 'var(--cat-blue)';

interface Row {
  readonly month: string;
  readonly kind: 'actual' | 'forecast';
  readonly actual: Kopecks | null;
  readonly projected: Kopecks | null;
  readonly band: [Kopecks, Kopecks] | null;
  readonly cash: Kopecks;
  readonly inGoals: Kopecks;
  readonly total: Kopecks;
}

function ForecastTooltip({ active, payload }: TooltipContentProps) {
  const row = payload?.[0]?.payload as Row | undefined;
  if (!active || !row) return null;
  return (
    <ChartTooltipCard
      title={`${formatMonth(row.month)}${row.kind === 'forecast' ? ' · прогноз' : ''}`}
      rows={[
        {
          key: 'total',
          label: 'Всего денег',
          value: formatMoney(row.total),
          swatch: LINE,
          dashed: row.kind === 'forecast',
        },
        { key: 'goals', label: 'Из них в целях', value: formatMoney(row.inGoals) },
        { key: 'cash', label: 'Свободные', value: formatMoney(row.cash) },
      ]}
      footer={
        row.kind === 'forecast' && row.band
          ? `Вероятно от ${formatMoney(row.band[0])} до ${formatMoney(row.band[1])}`
          : undefined
      }
    />
  );
}

interface ForecastChartProps {
  readonly forecast: Forecast;
  readonly goals: readonly Goal[];
  readonly horizon: number;
  readonly limits: { readonly min: number; readonly max: number };
  readonly onHorizonChange: (months: number) => void;
}

export function ForecastChart({
  forecast,
  goals,
  horizon,
  limits,
  onHorizonChange,
}: ForecastChartProps) {
  const sliderId = useId();
  const rows = useMemo<Row[]>(() => {
    const lastActual = forecast.points.findLastIndex((p) => p.kind === 'actual');
    return forecast.points.map((point, index) => ({
      month: point.month,
      kind: point.kind,
      cash: point.cash,
      inGoals: point.inGoals,
      total: point.total,
      actual: point.kind === 'actual' ? point.total : null,
      // Пунктир стартует из последней фактической точки, чтобы линия не рвалась.
      projected: point.kind === 'forecast' || index === lastActual ? point.total : null,
      band: point.kind === 'forecast' || index === lastActual ? [point.low, point.high] : null,
    }));
  }, [forecast.points]);

  const goalsById = new Map(goals.map((g) => [g.id, g]));
  const last = forecast.points.at(-1);

  return (
    <Card
      title="Прогноз накоплений"
      subtitle="Сколько денег будет к концу каждого месяца при нынешних доходах и тратах"
    >
      <div className={styles.controls}>
        <label htmlFor={sliderId} className={styles.sliderLabel}>
          Горизонт: <b className="num">{horizon} мес.</b>
        </label>
        <input
          id={sliderId}
          type="range"
          min={limits.min}
          max={limits.max}
          step={1}
          value={horizon}
          onChange={(event) => onHorizonChange(Number(event.target.value))}
          className={styles.slider}
        />
      </div>

      <div className={styles.headline}>
        <div>
          <p className={styles.metricLabel}>Через {horizon} мес.</p>
          <p className={cx(styles.metric, 'num')}>{last ? formatMoney(last.total) : '—'}</p>
        </div>
        <div>
          <p className={styles.metricLabel}>Прирост в месяц</p>
          <p className={cx(styles.metric, 'num', forecast.monthlyNet < 0 && styles.negative)}>
            {formatMoney(forecast.monthlyNet, { signed: true })}
          </p>
        </div>
      </div>

      <Legend
        items={[
          { key: 'actual', label: 'Факт', color: LINE },
          { key: 'forecast', label: 'Прогноз', color: LINE, dashed: true },
        ]}
      />

      <div style={{ height: 280, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="month"
              tickFormatter={(month: string) => formatMonth(month, 'short')}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--axis)' }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={formatAxisMoney}
            />
            <Tooltip
              content={ForecastTooltip}
              cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
              wrapperStyle={{ outline: 'none' }}
            />
            <ReferenceLine y={0} stroke="var(--axis)" />
            <Area
              dataKey="band"
              stroke="none"
              fill={LINE}
              fillOpacity={0.1}
              isAnimationActive={false}
              activeDot={false}
              connectNulls={false}
            />
            <Line
              dataKey="actual"
              stroke={LINE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
              connectNulls={false}
            />
            <Line
              dataKey="projected"
              stroke={LINE}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
              connectNulls={false}
            />
            {forecast.milestones.map((milestone) => {
              const goal = goalsById.get(milestone.goalId);
              return (
                <ReferenceLine
                  key={milestone.goalId}
                  x={milestone.month}
                  stroke="var(--saving)"
                  strokeDasharray="2 4"
                  label={{ value: goal?.emoji ?? '🎯', position: 'top', fontSize: 16 }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {forecast.milestones.length > 0 && (
        <ul className={styles.milestones}>
          {forecast.milestones.map((milestone) => {
            const goal = goalsById.get(milestone.goalId);
            if (!goal) return null;
            return (
              <li key={milestone.goalId}>
                <span aria-hidden>{goal.emoji}</span> {goal.name} — накопится к{' '}
                <b>{formatMonth(milestone.month).toLowerCase()}</b>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
