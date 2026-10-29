// Построители тестовых данных: только для *.test.ts, в бандл приложения не попадают.
import type { Category, Goal, RecurringItem, Transaction } from '../entities';
import { DEFAULT_SETTINGS, type BudgetSettings } from '../entities';
import { rubles } from '../money';
import type { IsoDate } from '../period';

let sequence = 0;
const nextId = (prefix: string): string => `${prefix}-${(sequence += 1)}`;

export function category(overrides: Partial<Category> = {}): Category {
  return {
    id: nextId('cat'),
    name: 'Продукты',
    kind: 'expense',
    essential: false,
    color: 'blue',
    icon: 'cart',
    archived: false,
    sort: 0,
    ...overrides,
  };
}

export function expense(amountRub: number, date: IsoDate, categoryId: string): Transaction {
  return {
    id: nextId('tx'),
    type: 'expense',
    amount: rubles(amountRub),
    date,
    categoryId,
    goalId: null,
    note: '',
  };
}

export function income(amountRub: number, date: IsoDate, categoryId: string): Transaction {
  return { ...expense(amountRub, date, categoryId), type: 'income' };
}

export function saving(amountRub: number, date: IsoDate, goalId: string): Transaction {
  return {
    id: nextId('tx'),
    type: 'saving',
    amount: rubles(amountRub),
    date,
    categoryId: null,
    goalId,
    note: '',
  };
}

export function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: nextId('goal'),
    name: 'Ноутбук',
    emoji: '💻',
    target: rubles(60_000),
    deadline: '2027-03-31',
    createdOn: '2026-10-01',
    archived: false,
    ...overrides,
  };
}

export function recurring(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: nextId('rec'),
    kind: 'income',
    name: 'Зарплата',
    amount: rubles(50_000),
    dayOfMonth: 5,
    categoryId: null,
    active: true,
    ...overrides,
  };
}

export const settings = (overrides: Partial<BudgetSettings> = {}): BudgetSettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
});
