import type { Kopecks } from '../money';
import type { FlowKind } from './category';

/** Ежемесячный доход (зарплата, стипендия) или обязательный платёж (аренда, связь). */
export interface RecurringItem {
  readonly id: string;
  readonly kind: FlowKind;
  readonly name: string;
  readonly amount: Kopecks;
  /** 1–31; в коротких месяцах платёж переезжает на последний день. */
  readonly dayOfMonth: number;
  readonly categoryId: string | null;
  readonly active: boolean;
}

export type RecurringDraft = Omit<RecurringItem, 'id'>;
