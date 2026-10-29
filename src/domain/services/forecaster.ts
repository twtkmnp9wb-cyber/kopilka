import type { Category } from '../entities';
import type { Kopecks } from '../money';
import { addMonths, previousMonths, type IsoDate, type MonthKey } from '../period';
import { HISTORY_MONTHS, type BudgetPlan } from './budget-planner';
import { essentialCategoryIds, type Ledger } from './ledger';

export interface ForecastPoint {
  readonly month: MonthKey;
  readonly kind: 'actual' | 'forecast';
  /** Свободные деньги на конец месяца. */
  readonly cash: Kopecks;
  /** Деньги в целях на конец месяца. */
  readonly inGoals: Kopecks;
  readonly total: Kopecks;
  /** Коридор неопределённости прогноза (для фактических точек совпадает с total). */
  readonly low: Kopecks;
  readonly high: Kopecks;
}

export interface GoalMilestone {
  readonly goalId: string;
  readonly month: MonthKey;
}

export interface Forecast {
  readonly points: readonly ForecastPoint[];
  readonly milestones: readonly GoalMilestone[];
  /** Ожидаемый прирост денег за обычный месяц. */
  readonly monthlyNet: Kopecks;
  readonly expectedDiscretionary: Kopecks;
}

export interface ForecastInput {
  readonly plan: BudgetPlan;
  readonly ledger: Ledger;
  readonly categories: readonly Category[];
  readonly today: IsoDate;
  readonly horizon: number;
  /** Сколько прошлых месяцев показать фактом. */
  readonly historyMonths?: number;
}

/** Если истории трат нет, разброс считаем как долю от ожидаемых трат. */
const DEFAULT_VOLATILITY = 0.15;

/**
 * Прогноз накоплений: каждый будущий месяц = ожидаемый доход − обязательные − типичные
 * необязательные траты; взносы в цели перекладывают деньги из свободных в цели, пока цель
 * не накопится. Коридор растёт как σ·√k, где σ — разброс необязательных трат в истории.
 */
export function forecast(input: ForecastInput): Forecast {
  const { plan, ledger, categories, today, horizon } = input;
  const current = plan.month;
  const essentialIds = essentialCategoryIds(categories);

  const firstMonth = ledger.firstMonth();
  const historyMonths = previousMonths(current, input.historyMonths ?? 6).filter(
    (m) => firstMonth !== null && m >= firstMonth,
  );
  const actual: ForecastPoint[] = historyMonths.map((month) => {
    const { cash, inGoals } = ledger.balancesAtEndOf(month);
    const total = cash + inGoals;
    return { month, kind: 'actual', cash, inGoals, total, low: total, high: total };
  });

  const discretionarySamples = previousMonths(current, HISTORY_MONTHS)
    .filter((m) => ledger.hasActivity(m))
    .map((m) => ledger.expenseSplit(m, essentialIds).discretionary);
  const expectedDiscretionary =
    discretionarySamples.length > 0 ? plan.averageDiscretionary : Math.max(plan.free, 0);
  const sigma =
    discretionarySamples.length >= 2
      ? standardDeviation(discretionarySamples)
      : expectedDiscretionary * DEFAULT_VOLATILITY;

  const monthlyNet = plan.income.expected - plan.mandatory.expected - expectedDiscretionary;

  // Текущий месяц: от сегодняшних балансов докидываем то, что ещё должно случиться.
  const now = ledger.balances(today);
  const remainingThisMonth =
    Math.max(plan.income.expected - plan.income.actual, 0) -
    Math.max(plan.mandatory.expected - plan.mandatory.actual, 0) -
    Math.max(expectedDiscretionary - plan.discretionarySpent, 0);

  const goalState = plan.goals
    .filter((g) => g.status !== 'reached')
    .map((g) => ({
      id: g.goal.id,
      remaining: g.remaining,
      monthly: g.monthlyRequired,
      dueThisMonth: g.dueThisMonth,
    }));

  const milestones: GoalMilestone[] = [];
  let cash = now.cash + remainingThisMonth;
  let inGoals = now.inGoals;
  const points: ForecastPoint[] = [];

  for (let k = 0; k < horizon; k += 1) {
    const month = addMonths(current, k);
    if (k > 0) cash += monthlyNet;
    for (const goal of goalState) {
      if (goal.remaining <= 0) continue;
      const planned = k === 0 ? goal.dueThisMonth : goal.monthly;
      const contribution = Math.min(planned, goal.remaining, Math.max(cash, 0));
      goal.remaining -= contribution;
      cash -= contribution;
      inGoals += contribution;
      if (goal.remaining <= 0) milestones.push({ goalId: goal.id, month });
    }
    const total = cash + inGoals;
    const spread = Math.round((sigma * Math.sqrt(k + 1)) / 100) * 100;
    points.push({
      month,
      kind: 'forecast',
      cash,
      inGoals,
      total,
      low: total - spread,
      high: total + spread,
    });
  }

  return { points: [...actual, ...points], milestones, monthlyNet, expectedDiscretionary };
}

function standardDeviation(values: readonly number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
