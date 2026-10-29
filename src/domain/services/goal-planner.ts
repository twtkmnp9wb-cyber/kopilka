import type { Goal } from '../entities';
import { ceilToRuble, type Kopecks } from '../money';
import { addMonths, lastDayOf, monthOf, monthsBetween, type MonthKey } from '../period';
import type { Ledger } from './ledger';

export type GoalStatus = 'reached' | 'on-track' | 'behind' | 'overdue';

export interface GoalProgress {
  readonly goal: Goal;
  readonly saved: Kopecks;
  readonly remaining: Kopecks;
  /** 0…1 */
  readonly ratio: number;
  /** Месяцев до дедлайна, включая текущий; 0 — срок прошёл. */
  readonly monthsLeft: number;
  /** Рекомендуемый взнос в этом месяце, посчитанный от остатка на начало месяца. */
  readonly monthlyRequired: Kopecks;
  readonly savedThisMonth: Kopecks;
  /** Сколько ещё внести в этом месяце, чтобы остаться в графике. */
  readonly dueThisMonth: Kopecks;
  readonly status: GoalStatus;
  /** Насколько накопления отстают от линейного графика на начало месяца. */
  readonly behindBy: Kopecks;
}

/**
 * Прогресс цели в месяце `month`. Взнос считается от остатка на начало месяца,
 * поэтому внутри месяца он не «плавает»: внёс часть — уменьшается только dueThisMonth.
 */
export function planGoal(goal: Goal, ledger: Ledger, month: MonthKey): GoalProgress {
  const saved = ledger.goalBalances(lastDayOf(month)).get(goal.id) ?? 0;
  const savedBefore = ledger.goalBalances(lastDayOf(addMonths(month, -1))).get(goal.id) ?? 0;
  const savedThisMonth = saved - savedBefore;
  const remaining = Math.max(goal.target - saved, 0);
  const remainingAtStart = Math.max(goal.target - savedBefore, 0);

  const deadlineMonth = monthOf(goal.deadline);
  const monthsLeft = Math.max(monthsBetween(month, deadlineMonth) + 1, 0);
  const monthlyRequired =
    remainingAtStart === 0 ? 0 : ceilToRuble(remainingAtStart / Math.max(monthsLeft, 1));
  const dueThisMonth = Math.min(Math.max(monthlyRequired - savedThisMonth, 0), remaining);

  // Линейный график: от даты создания до дедлайна цель равномерно растёт от 0 до target.
  const createdMonth = monthOf(goal.createdOn);
  const totalMonths = Math.max(monthsBetween(createdMonth, deadlineMonth) + 1, 1);
  const elapsed = Math.min(Math.max(monthsBetween(createdMonth, month), 0), totalMonths);
  const expectedAtStart = Math.round((goal.target * elapsed) / totalMonths);
  const behindBy = ceilToRuble(Math.max(expectedAtStart - savedBefore, 0));

  let status: GoalStatus;
  if (remaining === 0) status = 'reached';
  else if (monthsLeft === 0) status = 'overdue';
  else if (behindBy > 0) status = 'behind';
  else status = 'on-track';

  return {
    goal,
    saved,
    remaining,
    ratio: goal.target > 0 ? Math.min(saved / goal.target, 1) : 1,
    monthsLeft,
    monthlyRequired,
    savedThisMonth,
    dueThisMonth,
    status,
    behindBy,
  };
}

/** Активные цели: не в архиве, по возрастанию дедлайна. */
export const activeGoals = (goals: readonly Goal[]): Goal[] =>
  goals.filter((g) => !g.archived).sort((a, b) => a.deadline.localeCompare(b.deadline));

/**
 * Месяц, к которому цель реально накопится, если откладывать `monthly` каждый месяц,
 * начиная с `from`. `null` — при нулевом взносе цель недостижима.
 */
export function estimateReachMonth(
  remaining: Kopecks,
  monthly: Kopecks,
  from: MonthKey,
): MonthKey | null {
  if (remaining <= 0) return from;
  if (monthly <= 0) return null;
  return addMonths(from, Math.ceil(remaining / monthly) - 1);
}
