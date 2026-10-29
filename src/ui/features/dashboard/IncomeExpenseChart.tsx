import { useNavigate } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { MonthPoint } from '@/application';
import { formatMoney, formatMonth } from '@/domain';
import { AXIS_TICK, formatAxisMoney } from '@/ui/shared/charts/axis';
import { ChartTooltipCard, Legend } from '@/ui/shared/charts/ChartTooltip';
import { Card } from '@/ui/shared/components/Card';
import { usePeriod } from '@/ui/shared/period';

const SERIES = [
  { key: 'income', label: 'Доходы', color: 'var(--income)' },
  { key: 'expense', label: 'Расходы', color: 'var(--expense)' },
] as const;

function BarsTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as MonthPoint | undefined;
  if (!active || !point) return null;
  const net = point.income - point.expense;
  return (
    <ChartTooltipCard
      title={formatMonth(point.month)}
      rows={SERIES.map((s) => ({
        key: s.key,
        label: s.label,
        value: formatMoney(point[s.key]),
        swatch: s.color,
      }))}
      footer={`Разница: ${formatMoney(net, { signed: true })}`}
    />
  );
}

export function IncomeExpenseChart({ history }: { history: readonly MonthPoint[] }) {
  const navigate = useNavigate();
  const { setMonth } = usePeriod();
  const data = history.map((point) => ({ ...point, label: formatMonth(point.month, 'short') }));

  return (
    <Card
      title="Доходы и расходы"
      subtitle="Последние 6 месяцев · нажми на месяц, чтобы открыть операции"
    >
      <Legend items={SERIES.map((s) => ({ key: s.key, label: s.label, color: s.color }))} />
      <div style={{ height: 240, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={2}
            barCategoryGap="28%"
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--axis)' }}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={60}
              tickFormatter={formatAxisMoney}
            />
            <Tooltip
              content={BarsTooltip}
              cursor={{ fill: 'var(--surface-2)', radius: 8 }}
              wrapperStyle={{ outline: 'none' }}
            />
            {SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                fill={series.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                cursor="pointer"
                onClick={(entry: { payload?: MonthPoint }) => {
                  if (!entry.payload) return;
                  setMonth(entry.payload.month);
                  navigate('/transactions');
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
