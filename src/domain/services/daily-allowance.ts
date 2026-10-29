import type { Category } from '../entities';
import { floorToRuble, type Kopecks } from '../money';
import { addDays, daysLeftInMonth, monthOf, type IsoDate } from '../period';
import type { BudgetPlan } from './budget-planner';
import { essentialCategoryIds, type Ledger } from './ledger';

export type AllowanceState = 'ok' | 'tight' | 'over';

export interface DailyAllowance {
  readonly date: IsoDate;
  /** Дней до конца месяца, включая сегодня. */
  readonly daysLeft: number;
  /** Сколько можно потратить сегодня по плану (до учёта сегодняшних трат). */
  readonly dailyLimit: Kopecks;
  readonly spentToday: Kopecks;
  /** Остаток на сегодня; отрицательный — перерасход. */
  readonly leftToday: Kopecks;
  /** Остаток свободного лимита до конца месяца. */
  readonly leftInMonth: Kopecks;
  readonly state: AllowanceState;
}

/** Ниже этой доли дневного лимита состояние «впритык». */
const TIGHT_RATIO = 0.25;

/**
 * «Можно тратить сегодня»: остаток свободного лимита на начало дня делится на оставшиеся дни.
 * Вчерашний перерасход автоматически уменьшает сегодняшнюю цифру, экономия — увеличивает.
 */
export function dailyAllowance(
  plan: BudgetPlan,
  ledger: Ledger,
  categories: readonly Category[],
  today: IsoDate,
): DailyAllowance {
  if (monthOf(today) !== plan.month) {
    throw new Error(`Дневной лимит считается только для текущего месяца (${plan.month})`);
  }
  const essentialIds = essentialCategoryIds(categories);
  const before = ledger.expenseSplit(plan.month, essentialIds, { until: addDays(today, -1) });
  const todaySplit = ledger.expenseSplit(plan.month, essentialIds, { on: today });

  const daysLeft = daysLeftInMonth(today);
  const availableAtStart = plan.free - before.discretionary;
  const dailyLimit = Math.max(floorToRuble(availableAtStart / daysLeft), 0);
  const spentToday = todaySplit.discretionary;
  const leftToday = dailyLimit - spentToday;

  let state: AllowanceState = 'ok';
  if (leftToday < 0 || dailyLimit === 0) state = 'over';
  else if (leftToday < dailyLimit * TIGHT_RATIO) state = 'tight';

  return {
    date: today,
    daysLeft,
    dailyLimit,
    spentToday,
    leftToday,
    leftInMonth: availableAtStart - spentToday,
    state,
  };
}
