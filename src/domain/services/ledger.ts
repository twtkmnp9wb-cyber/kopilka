import type { Category, Transaction } from '../entities';
import type { Kopecks } from '../money';
import { compareDates, lastDayOf, monthOf, type IsoDate, type MonthKey } from '../period';

/** Итоги месяца по типам операций. */
export interface MonthTotals {
  readonly income: Kopecks;
  readonly expense: Kopecks;
  /** Чистый перевод в цели: отложено минус забрано. */
  readonly saved: Kopecks;
}

export const EMPTY_TOTALS: MonthTotals = { income: 0, expense: 0, saved: 0 };

/** Индекс операций по месяцам — строится один раз и переиспользуется всеми расчётами. */
export class Ledger {
  private readonly byMonth = new Map<MonthKey, Transaction[]>();

  constructor(readonly transactions: readonly Transaction[]) {
    for (const transaction of transactions) {
      const month = monthOf(transaction.date);
      const bucket = this.byMonth.get(month);
      if (bucket) bucket.push(transaction);
      else this.byMonth.set(month, [transaction]);
    }
  }

  inMonth(month: MonthKey): readonly Transaction[] {
    return this.byMonth.get(month) ?? [];
  }

  hasActivity(month: MonthKey): boolean {
    return this.byMonth.has(month);
  }

  /** Самый ранний месяц с операциями. */
  firstMonth(): MonthKey | null {
    let first: MonthKey | null = null;
    for (const month of this.byMonth.keys()) if (first === null || month < first) first = month;
    return first;
  }

  totals(month: MonthKey): MonthTotals {
    let income = 0;
    let expense = 0;
    let saved = 0;
    for (const t of this.inMonth(month)) {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
      else saved += t.amount;
    }
    return { income, expense, saved };
  }

  /** Расходы месяца по категориям. Операции без категории попадают под ключ `null`. */
  expensesByCategory(month: MonthKey): Map<string | null, Kopecks> {
    const result = new Map<string | null, Kopecks>();
    for (const t of this.inMonth(month)) {
      if (t.type !== 'expense') continue;
      result.set(t.categoryId, (result.get(t.categoryId) ?? 0) + t.amount);
    }
    return result;
  }

  /**
   * Расходы месяца, разделённые на обязательные и свободные. Если передать `until`,
   * учитываются только операции не позже этой даты; `on` — только за один день.
   */
  expenseSplit(
    month: MonthKey,
    essentialIds: ReadonlySet<string>,
    filter: { until?: IsoDate; on?: IsoDate } = {},
  ): { essential: Kopecks; discretionary: Kopecks } {
    let essential = 0;
    let discretionary = 0;
    for (const t of this.inMonth(month)) {
      if (t.type !== 'expense') continue;
      if (filter.until && compareDates(t.date, filter.until) > 0) continue;
      if (filter.on && t.date !== filter.on) continue;
      if (t.categoryId && essentialIds.has(t.categoryId)) essential += t.amount;
      else discretionary += t.amount;
    }
    return { essential, discretionary };
  }

  /** Сколько накоплено в каждой цели к концу дня `until` (по умолчанию — за всё время). */
  goalBalances(until?: IsoDate): Map<string, Kopecks> {
    const balances = new Map<string, Kopecks>();
    for (const t of this.transactions) {
      if (t.type !== 'saving' || !t.goalId) continue;
      if (until && compareDates(t.date, until) > 0) continue;
      balances.set(t.goalId, (balances.get(t.goalId) ?? 0) + t.amount);
    }
    return balances;
  }

  /** Свободные деньги и деньги в целях на конец дня `until`. */
  balances(until?: IsoDate): { cash: Kopecks; inGoals: Kopecks } {
    let cash = 0;
    let inGoals = 0;
    for (const t of this.transactions) {
      if (until && compareDates(t.date, until) > 0) continue;
      if (t.type === 'income') cash += t.amount;
      else if (t.type === 'expense') cash -= t.amount;
      else {
        cash -= t.amount;
        inGoals += t.amount;
      }
    }
    return { cash, inGoals };
  }

  balancesAtEndOf(month: MonthKey): { cash: Kopecks; inGoals: Kopecks } {
    return this.balances(lastDayOf(month));
  }
}

export const essentialCategoryIds = (categories: readonly Category[]): ReadonlySet<string> =>
  new Set(categories.filter((c) => c.kind === 'expense' && c.essential).map((c) => c.id));

/**
 * Среднее по месяцам, в которых вообще были операции: новичку не занижаем цифры пустыми месяцами.
 * Округляется до целых рублей — копейки в плановых цифрах только мешают.
 */
export function averageOverActiveMonths(
  ledger: Ledger,
  months: readonly MonthKey[],
  pick: (month: MonthKey) => Kopecks,
): { average: Kopecks; samples: Kopecks[] } {
  const active = months.filter((month) => ledger.hasActivity(month));
  const samples = active.map(pick);
  const average =
    samples.length > 0
      ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length / 100) * 100
      : 0;
  return { average, samples };
}
