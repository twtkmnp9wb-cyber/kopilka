import { z } from 'zod';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type Category,
  type CategoryDraft,
  type Goal,
  type GoalDraft,
  type RecurringDraft,
  type RecurringItem,
  type Transaction,
  type TransactionDraft,
} from '@/domain';
import type { TableMapping } from './supabase-repository';

// Колонки таблиц в snake_case → сущности домена. Схема строки проверяется zod-ом:
// если кто-то поменяет базу руками, приложение упадёт с понятной ошибкой, а не тихо.

/** Убирает undefined, чтобы частичное обновление не затирало колонки. */
const compact = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));

/** bigint из PostgREST может прийти строкой — приводим к числу. */
const kopecks = z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int());

const categoryRow = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['income', 'expense']),
  essential: z.boolean(),
  color: z.enum(CATEGORY_COLORS).catch('blue'),
  icon: z.enum(CATEGORY_ICONS).catch('more'),
  archived: z.boolean(),
  sort: z.number().int(),
});

export const categoryMapping: TableMapping<Category, CategoryDraft> = {
  table: 'fin_categories',
  order: [
    { column: 'sort', ascending: true },
    { column: 'created_at', ascending: true },
  ],
  parse: (row) => categoryRow.parse(row),
  toRow: (c) =>
    compact({
      name: c.name,
      kind: c.kind,
      essential: c.essential,
      color: c.color,
      icon: c.icon,
      archived: c.archived,
      sort: c.sort,
    }),
};

const transactionRow = z.object({
  id: z.string(),
  type: z.enum(['income', 'expense', 'saving']),
  amount_kop: kopecks,
  occurred_on: z.string(),
  category_id: z.string().nullable(),
  goal_id: z.string().nullable(),
  note: z.string(),
});

export const transactionMapping: TableMapping<Transaction, TransactionDraft> = {
  table: 'fin_transactions',
  order: [
    { column: 'occurred_on', ascending: false },
    { column: 'created_at', ascending: false },
  ],
  parse: (row) => {
    const r = transactionRow.parse(row);
    return {
      id: r.id,
      type: r.type,
      amount: r.amount_kop,
      date: r.occurred_on,
      categoryId: r.category_id,
      goalId: r.goal_id,
      note: r.note,
    };
  },
  toRow: (t) =>
    compact({
      type: t.type,
      amount_kop: t.amount,
      occurred_on: t.date,
      category_id: t.categoryId,
      goal_id: t.goalId,
      note: t.note,
    }),
};

const goalRow = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  target_kop: kopecks,
  deadline: z.string(),
  created_on: z.string(),
  archived: z.boolean(),
});

export const goalMapping: TableMapping<Goal, GoalDraft> = {
  table: 'fin_goals',
  order: [{ column: 'deadline', ascending: true }],
  parse: (row) => {
    const r = goalRow.parse(row);
    return {
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      target: r.target_kop,
      deadline: r.deadline,
      createdOn: r.created_on,
      archived: r.archived,
    };
  },
  toRow: (g) =>
    compact({
      name: g.name,
      emoji: g.emoji,
      target_kop: g.target,
      deadline: g.deadline,
      created_on: g.createdOn,
      archived: g.archived,
    }),
};

const recurringRow = z.object({
  id: z.string(),
  kind: z.enum(['income', 'expense']),
  name: z.string(),
  amount_kop: kopecks,
  day_of_month: z.number().int(),
  category_id: z.string().nullable(),
  active: z.boolean(),
});

export const recurringMapping: TableMapping<RecurringItem, RecurringDraft> = {
  table: 'fin_recurring',
  order: [
    { column: 'kind', ascending: false },
    { column: 'day_of_month', ascending: true },
  ],
  parse: (row) => {
    const r = recurringRow.parse(row);
    return {
      id: r.id,
      kind: r.kind,
      name: r.name,
      amount: r.amount_kop,
      dayOfMonth: r.day_of_month,
      categoryId: r.category_id,
      active: r.active,
    };
  },
  toRow: (r) =>
    compact({
      kind: r.kind,
      name: r.name,
      amount_kop: r.amount,
      day_of_month: r.dayOfMonth,
      category_id: r.categoryId,
      active: r.active,
    }),
};
