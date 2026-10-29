import {
  Ledger,
  addMonths,
  dailyAllowance,
  forecast,
  monthOf,
  monthSequence,
  planBudget,
  sumOf,
  type BudgetPlan,
  type BudgetSettings,
  type Category,
  type CategoryColor,
  type DailyAllowance,
  type Forecast,
  type Goal,
  type GoalProgress,
  type IsoDate,
  type Kopecks,
  type MonthKey,
  type MonthTotals,
  type RecurringItem,
  type Transaction,
} from '@/domain';

/** Всё, что знает о пользователе приложение, — вход для построения экранов. */
export interface FinanceSnapshot {
  readonly transactions: readonly Transaction[];
  readonly categories: readonly Category[];
  readonly goals: readonly Goal[];
  readonly recurring: readonly RecurringItem[];
  readonly settings: BudgetSettings;
}

export interface CategorySlice {
  readonly key: string;
  readonly name: string;
  readonly color: CategoryColor | 'neutral';
  readonly category: Category | null;
  readonly amount: Kopecks;
  readonly share: number;
}

export interface MonthPoint extends MonthTotals {
  readonly month: MonthKey;
}

export interface MonthOverview {
  readonly month: MonthKey;
  readonly isCurrent: boolean;
  readonly totals: MonthTotals;
  readonly previous: MonthTotals;
  /** Шесть месяцев, заканчивая выбранным. */
  readonly history: readonly MonthPoint[];
  readonly spending: readonly CategorySlice[];
  readonly spendingTotal: Kopecks;
  readonly plan: BudgetPlan;
  readonly allowance: DailyAllowance | null;
  readonly nearestGoal: GoalProgress | null;
  readonly hasAnyData: boolean;
}

/** Больше семи категорий на круговой диаграмме не различить — остальное сворачиваем. */
const MAX_SLICES = 7;

export function createLedger(snapshot: FinanceSnapshot): Ledger {
  return new Ledger(snapshot.transactions);
}

export function buildPlan(
  snapshot: FinanceSnapshot,
  month: MonthKey,
  ledger = createLedger(snapshot),
) {
  return planBudget({
    month,
    ledger,
    categories: snapshot.categories,
    recurring: snapshot.recurring,
    goals: snapshot.goals,
    settings: snapshot.settings,
  });
}

export function buildMonthOverview(
  snapshot: FinanceSnapshot,
  month: MonthKey,
  today: IsoDate,
): MonthOverview {
  const ledger = createLedger(snapshot);
  const plan = buildPlan(snapshot, month, ledger);
  const isCurrent = monthOf(today) === month;
  const categoriesById = new Map(snapshot.categories.map((c) => [c.id, c]));

  const history = monthSequence(addMonths(month, -5), 6).map((m) => ({
    month: m,
    ...ledger.totals(m),
  }));

  const spendingRaw = [...ledger.expensesByCategory(month)]
    .map(([id, amount]) => ({ category: id ? (categoriesById.get(id) ?? null) : null, id, amount }))
    .sort((a, b) => b.amount - a.amount);
  const spendingTotal = sumOf(spendingRaw.map((s) => s.amount));
  const head = spendingRaw.slice(0, spendingRaw.length > MAX_SLICES ? MAX_SLICES - 1 : MAX_SLICES);
  const tail = spendingRaw.slice(head.length);
  const spending: CategorySlice[] = head.map(({ category, id, amount }) => ({
    key: id ?? 'none',
    name: category?.name ?? 'Без категории',
    color: category?.color ?? 'neutral',
    category,
    amount,
    share: spendingTotal > 0 ? amount / spendingTotal : 0,
  }));
  if (tail.length > 0) {
    const amount = sumOf(tail.map((s) => s.amount));
    spending.push({
      key: 'other',
      name: `Остальное (${tail.length})`,
      color: 'neutral',
      category: null,
      amount,
      share: spendingTotal > 0 ? amount / spendingTotal : 0,
    });
  }

  const pendingGoals = plan.goals.filter((g) => g.status !== 'reached');

  return {
    month,
    isCurrent,
    totals: ledger.totals(month),
    previous: ledger.totals(addMonths(month, -1)),
    history,
    spending,
    spendingTotal,
    plan,
    allowance: isCurrent ? dailyAllowance(plan, ledger, snapshot.categories, today) : null,
    nearestGoal: pendingGoals[0] ?? null,
    hasAnyData: snapshot.transactions.length > 0,
  };
}

export function buildForecast(
  snapshot: FinanceSnapshot,
  today: IsoDate,
  horizon: number,
): { plan: BudgetPlan; forecast: Forecast } {
  const ledger = createLedger(snapshot);
  const plan = buildPlan(snapshot, monthOf(today), ledger);
  return {
    plan,
    forecast: forecast({ plan, ledger, categories: snapshot.categories, today, horizon }),
  };
}

export interface DayGroup {
  readonly date: IsoDate;
  readonly income: Kopecks;
  readonly expense: Kopecks;
  readonly items: readonly Transaction[];
}

/** Операции месяца по дням, от новых к старым. */
export function groupByDay(transactions: readonly Transaction[]): DayGroup[] {
  const byDate = new Map<IsoDate, Transaction[]>();
  for (const t of transactions) {
    const bucket = byDate.get(t.date);
    if (bucket) bucket.push(t);
    else byDate.set(t.date, [t]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, items]) => ({
      date,
      items,
      income: sumOf(items.filter((t) => t.type === 'income').map((t) => t.amount)),
      expense: sumOf(items.filter((t) => t.type === 'expense').map((t) => t.amount)),
    }));
}
