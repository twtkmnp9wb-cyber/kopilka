import { z } from 'zod';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  SETTINGS_LIMITS,
  isIsoDate,
  parseMoney,
  type CategoryDraft,
  type GoalDraft,
  type RecurringDraft,
  type TransactionDraft,
} from '@/domain';

// Схемы форм: на входе — то, что ввёл пользователь (строки), на выходе — черновик сущности.
// Их используют и формы (react-hook-form), и use-cases, поэтому правила живут в одном месте.

const money = (message = 'Введи сумму больше нуля') =>
  z
    .string()
    .trim()
    .min(1, 'Введи сумму')
    .transform((value, ctx) => {
      const amount = parseMoney(value);
      if (amount === null || amount <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
      return amount;
    });

const isoDate = z.string().refine(isIsoDate, 'Выбери дату');

export const transactionFormSchema = z
  .object({
    type: z.enum(['income', 'expense', 'saving']),
    amount: money(),
    date: isoDate,
    categoryId: z.string().nullable(),
    goalId: z.string().nullable(),
    /** Для перевода в цель: забрать деньги из цели обратно. */
    withdraw: z.boolean(),
    note: z.string().trim().max(200, 'Не длиннее 200 символов'),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'saving' && !value.goalId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['goalId'], message: 'Выбери цель' });
    }
    if (value.type !== 'saving' && !value.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryId'],
        message: 'Выбери категорию',
      });
    }
  })
  .transform((value): TransactionDraft => ({
    type: value.type,
    amount: value.type === 'saving' && value.withdraw ? -value.amount : value.amount,
    date: value.date,
    categoryId: value.type === 'saving' ? null : value.categoryId,
    goalId: value.type === 'saving' ? value.goalId : null,
    note: value.note,
  }));
export type TransactionFormValues = z.input<typeof transactionFormSchema>;

export const goalFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Назови цель').max(60, 'Не длиннее 60 символов'),
    emoji: z.string().trim().min(1).max(8),
    target: money('Сумма цели должна быть больше нуля'),
    deadline: isoDate,
    createdOn: isoDate,
  })
  .refine((value) => value.deadline >= value.createdOn, {
    path: ['deadline'],
    message: 'Срок не может быть в прошлом',
  })
  .transform((value): GoalDraft => ({ ...value, archived: false }));
export type GoalFormValues = z.input<typeof goalFormSchema>;

export const recurringFormSchema = z
  .object({
    kind: z.enum(['income', 'expense']),
    name: z.string().trim().min(1, 'Назови платёж').max(60, 'Не длиннее 60 символов'),
    amount: money(),
    dayOfMonth: z.coerce
      .number({ invalid_type_error: 'Число от 1 до 31' })
      .int('Число от 1 до 31')
      .min(1, 'Число от 1 до 31')
      .max(31, 'Число от 1 до 31'),
    categoryId: z.string().nullable(),
    active: z.boolean(),
  })
  .refine((value) => value.kind === 'income' || value.categoryId, {
    path: ['categoryId'],
    message: 'Выбери обязательную категорию',
  })
  .transform((value): RecurringDraft => value);
export type RecurringFormValues = z.input<typeof recurringFormSchema>;

export const categoryFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Назови категорию').max(40, 'Не длиннее 40 символов'),
    kind: z.enum(['income', 'expense']),
    essential: z.boolean(),
    color: z.enum(CATEGORY_COLORS),
    icon: z.enum(CATEGORY_ICONS),
    sort: z.number().int(),
  })
  .transform((value): CategoryDraft => ({
    ...value,
    essential: value.kind === 'expense' && value.essential,
    archived: false,
  }));
export type CategoryFormValues = z.input<typeof categoryFormSchema>;

export const settingsSchema = z.object({
  cushionPercent: z
    .number()
    .int()
    .min(SETTINGS_LIMITS.cushionPercent.min)
    .max(SETTINGS_LIMITS.cushionPercent.max),
  forecastMonths: z
    .number()
    .int()
    .min(SETTINGS_LIMITS.forecastMonths.min)
    .max(SETTINGS_LIMITS.forecastMonths.max),
});

export const credentialsSchema = z.object({
  email: z.string().trim().email('Похоже, в почте опечатка'),
  password: z.string().min(6, 'Пароль — минимум 6 символов').max(72, 'Слишком длинный пароль'),
});
export type Credentials = z.infer<typeof credentialsSchema>;
