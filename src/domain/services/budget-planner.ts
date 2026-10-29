import type { BudgetSettings, Category, Goal, RecurringItem } from '../entities';
import { splitProportionally, sumOf, type Kopecks } from '../money';
import { monthOf, previousMonths, type MonthKey } from '../period';
import { activeGoals, estimateReachMonth, planGoal, type GoalProgress } from './goal-planner';
import { averageOverActiveMonths, essentialCategoryIds, type Ledger } from './ledger';

/** Сколько прошлых месяцев берём для средних значений. */
export const HISTORY_MONTHS = 3;

export type IncomeSource = 'recurring' | 'history' | 'actual' | 'none';
export type MandatorySource = 'recurring' | 'history' | 'none';

export interface CategoryBudget {
  readonly category: Category;
  readonly limit: Kopecks;
  readonly spent: Kopecks;
  /** spent / limit; Infinity, если лимит нулевой, а траты есть. */
  readonly ratio: number;
}

export interface GoalSuggestion {
  readonly progress: GoalProgress;
  /** Реальный месяц достижения при текущих доходах; null — при нынешнем бюджете недостижима. */
  readonly realisticMonth: MonthKey | null;
}

export interface BudgetPlan {
  readonly month: MonthKey;
  readonly income: {
    readonly expected: Kopecks;
    readonly planned: Kopecks;
    readonly actual: Kopecks;
    readonly source: IncomeSource;
  };
  readonly mandatory: {
    /** Сумма, заложенная в план: максимум из запланированного и уже потраченного. */
    readonly expected: Kopecks;
    readonly planned: Kopecks;
    readonly actual: Kopecks;
    readonly source: MandatorySource;
  };
  readonly goals: readonly GoalProgress[];
  readonly goalsAllocation: Kopecks;
  readonly cushion: Kopecks;
  /** Свободный лимит на необязательные траты; отрицательный — доходов не хватает на план. */
  readonly free: Kopecks;
  readonly shortfall: Kopecks;
  readonly categories: readonly CategoryBudget[];
  /** Необязательные траты, уже сделанные в этом месяце. */
  readonly discretionarySpent: Kopecks;
  /** Средние необязательные траты за прошлые месяцы (0, если истории нет). */
  readonly averageDiscretionary: Kopecks;
  readonly suggestions: readonly GoalSuggestion[];
}

export interface BudgetInput {
  readonly month: MonthKey;
  readonly ledger: Ledger;
  readonly categories: readonly Category[];
  readonly recurring: readonly RecurringItem[];
  readonly goals: readonly Goal[];
  readonly settings: BudgetSettings;
}

/**
 * Рекомендуемый бюджет месяца:
 * свободный лимит = доход − обязательные платежи − взносы в цели − подушка,
 * а лимит раскладывается по категориям пропорционально тратам прошлых месяцев.
 */
export function planBudget(input: BudgetInput): BudgetPlan {
  const { month, ledger, categories, recurring, settings } = input;
  const history = previousMonths(month, HISTORY_MONTHS);
  const essentialIds = essentialCategoryIds(categories);
  const active = recurring.filter((item) => item.active);

  // Доход: регулярные поступления → среднее за прошлые месяцы → уже пришедшее в этом.
  const recurringIncome = sumOf(active.filter((i) => i.kind === 'income').map((i) => i.amount));
  const historyIncome = averageOverActiveMonths(ledger, history, (m) => ledger.totals(m).income);
  const plannedIncome = recurringIncome > 0 ? recurringIncome : historyIncome.average;
  const actualIncome = ledger.totals(month).income;
  const expectedIncome = Math.max(plannedIncome, actualIncome);
  const incomeSource: IncomeSource =
    expectedIncome === 0
      ? 'none'
      : actualIncome > plannedIncome
        ? 'actual'
        : recurringIncome > 0
          ? 'recurring'
          : 'history';

  // Обязательные траты: регулярные платежи, а без них — средние траты обязательных категорий.
  const recurringMandatory = sumOf(active.filter((i) => i.kind === 'expense').map((i) => i.amount));
  const historyMandatory = averageOverActiveMonths(
    ledger,
    history,
    (m) => ledger.expenseSplit(m, essentialIds).essential,
  );
  const plannedMandatory = recurringMandatory > 0 ? recurringMandatory : historyMandatory.average;
  const split = ledger.expenseSplit(month, essentialIds);
  const expectedMandatory = Math.max(plannedMandatory, split.essential);
  const mandatorySource: MandatorySource =
    recurringMandatory > 0 ? 'recurring' : historyMandatory.average > 0 ? 'history' : 'none';

  // Цели: если в этом месяце уже внесли больше рекомендации, в план идёт фактическая сумма.
  const goals = activeGoals(input.goals).map((goal) => planGoal(goal, ledger, month));
  const goalsAllocation = sumOf(
    goals.map((g) => Math.max(g.status === 'reached' ? 0 : g.monthlyRequired, g.savedThisMonth, 0)),
  );

  const cushion = Math.round((expectedIncome * settings.cushionPercent) / 100);
  const free = expectedIncome - expectedMandatory - goalsAllocation - cushion;

  const historyDiscretionary = averageOverActiveMonths(
    ledger,
    history,
    (m) => ledger.expenseSplit(m, essentialIds).discretionary,
  );

  return {
    month,
    income: {
      expected: expectedIncome,
      planned: plannedIncome,
      actual: actualIncome,
      source: incomeSource,
    },
    mandatory: {
      expected: expectedMandatory,
      planned: plannedMandatory,
      actual: split.essential,
      source: mandatorySource,
    },
    goals,
    goalsAllocation,
    cushion,
    free,
    shortfall: Math.max(-free, 0),
    categories: distributeLimits(Math.max(free, 0), month, ledger, categories, history),
    discretionarySpent: split.discretionary,
    averageDiscretionary: historyDiscretionary.average,
    suggestions:
      free < 0
        ? suggestDeadlines(goals, {
            month,
            capacity: expectedIncome - expectedMandatory - cushion - historyDiscretionary.average,
          })
        : [],
  };
}

function distributeLimits(
  free: Kopecks,
  month: MonthKey,
  ledger: Ledger,
  categories: readonly Category[],
  history: readonly MonthKey[],
): CategoryBudget[] {
  const flexible = categories
    .filter((c) => c.kind === 'expense' && !c.essential && !c.archived)
    .sort((a, b) => a.sort - b.sort);
  if (flexible.length === 0) return [];

  const historySpend = new Map<string, Kopecks>();
  for (const m of history) {
    for (const [id, amount] of ledger.expensesByCategory(m)) {
      if (id) historySpend.set(id, (historySpend.get(id) ?? 0) + amount);
    }
  }
  const current = ledger.expensesByCategory(month);
  const limits = splitProportionally(
    free,
    flexible.map((c) => historySpend.get(c.id) ?? 0),
  );

  return flexible
    .map((category, index) => {
      const limit = limits[index] ?? 0;
      const spent = current.get(category.id) ?? 0;
      return {
        category,
        limit,
        spent,
        ratio: limit > 0 ? spent / limit : spent > 0 ? Number.POSITIVE_INFINITY : 0,
      };
    })
    .sort((a, b) => b.limit - a.limit || b.spent - a.spent);
}

/**
 * Когда взносы в цели не помещаются в доход, делим реальную «ёмкость» на цели
 * пропорционально рекомендованным взносам и считаем, к какому месяцу каждая накопится.
 */
function suggestDeadlines(
  goals: readonly GoalProgress[],
  { month, capacity }: { month: MonthKey; capacity: Kopecks },
): GoalSuggestion[] {
  const pending = goals.filter((g) => g.status !== 'reached' && g.monthlyRequired > 0);
  const shares = splitProportionally(
    Math.max(capacity, 0),
    pending.map((g) => g.monthlyRequired),
  );
  return pending
    .map((progress, index) => ({
      progress,
      realisticMonth: estimateReachMonth(progress.remaining, shares[index] ?? 0, month),
    }))
    .filter(
      ({ progress, realisticMonth }) =>
        realisticMonth === null || realisticMonth > monthOf(progress.goal.deadline),
    );
}
