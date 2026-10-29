import type { Kopecks } from '../money';
import type { IsoDate } from '../period';

/**
 * - `income` / `expense` — деньги пришли или ушли, всегда с категорией;
 * - `saving` — перевод между «свободными» деньгами и целью: положительная сумма
 *   откладывает в цель, отрицательная — забирает обратно.
 */
export type TransactionType = 'income' | 'expense' | 'saving';

export interface Transaction {
  readonly id: string;
  readonly type: TransactionType;
  /** Для income/expense всегда > 0, для saving — со знаком. */
  readonly amount: Kopecks;
  readonly date: IsoDate;
  readonly categoryId: string | null;
  readonly goalId: string | null;
  readonly note: string;
}

export type TransactionDraft = Omit<Transaction, 'id'>;

export type TransactionProblem =
  'amount-zero' | 'amount-negative' | 'category-required' | 'goal-required' | 'goal-not-allowed';

/** Инварианты операции: проверяются перед сохранением в любом хранилище. */
export function validateTransaction(draft: TransactionDraft): TransactionProblem[] {
  const problems: TransactionProblem[] = [];
  if (draft.amount === 0) problems.push('amount-zero');
  if (draft.type === 'saving') {
    if (!draft.goalId) problems.push('goal-required');
  } else {
    if (draft.amount < 0) problems.push('amount-negative');
    if (!draft.categoryId) problems.push('category-required');
    if (draft.goalId) problems.push('goal-not-allowed');
  }
  return problems;
}
