import {
  DEFAULT_CATEGORIES,
  validateTransaction,
  type BudgetSettings,
  type Category,
  type CategoryDraft,
  type GoalDraft,
  type Kopecks,
  type RecurringDraft,
  type Transaction,
  type TransactionDraft,
} from '@/domain';
import { AppError, type Clock, type Repositories } from './ports';
import { settingsSchema } from './schemas';

const PROBLEM_MESSAGES: Record<string, string> = {
  'amount-zero': 'Сумма не может быть нулевой',
  'amount-negative': 'Сумма должна быть положительной',
  'category-required': 'Выбери категорию',
  'goal-required': 'Выбери цель',
  'goal-not-allowed': 'Цель указывается только для перевода в копилку',
};

function assertValidTransaction(draft: TransactionDraft): void {
  const [problem] = validateTransaction(draft);
  if (problem)
    throw new AppError(PROBLEM_MESSAGES[problem] ?? 'Операция заполнена неверно', problem);
}

const withoutId = <T extends { readonly id: string }>({ id: _id, ...rest }: T): Omit<T, 'id'> =>
  rest;

/**
 * Сценарии приложения поверх портов. UI зовёт только их — не репозитории напрямую,
 * поэтому правила (валидация, первичное заполнение, ограничения настроек) не размазаны по экранам.
 */
export function createUseCases(repos: Repositories, clock: Clock) {
  let seeding: Promise<Category[]> | null = null;

  return {
    clock,

    transactions: {
      list: () => repos.transactions.list(),
      async save(draft: TransactionDraft, id?: string): Promise<Transaction> {
        assertValidTransaction(draft);
        return id ? repos.transactions.update(id, draft) : repos.transactions.create(draft);
      },
      remove: (id: string) => repos.transactions.remove(id),
      /** Вернуть удалённую операцию (кнопка «Отменить» в тосте). */
      restore: (transaction: Transaction) => repos.transactions.create(withoutId(transaction)),
    },

    categories: {
      /** Список категорий; при первом входе создаёт стандартный набор. */
      async listOrSeed(): Promise<Category[]> {
        const existing = await repos.categories.list();
        if (existing.length > 0) return existing;
        seeding ??= repos.categories
          .createMany(DEFAULT_CATEGORIES)
          .catch(() => repos.categories.list())
          .finally(() => {
            seeding = null;
          });
        return seeding;
      },
      save: (draft: CategoryDraft, id?: string) =>
        id ? repos.categories.update(id, draft) : repos.categories.create(draft),
      /** Категории не удаляются, а прячутся: на них ссылаются старые операции. */
      setArchived: (id: string, archived: boolean) => repos.categories.update(id, { archived }),
    },

    goals: {
      list: () => repos.goals.list(),
      save: (draft: GoalDraft, id?: string) =>
        id ? repos.goals.update(id, draft) : repos.goals.create(draft),
      setArchived: (id: string, archived: boolean) => repos.goals.update(id, { archived }),
      /** Удаляет цель вместе с её переводами: отложенные деньги возвращаются в свободные. */
      remove: (id: string) => repos.goals.remove(id),
      async contribute(goalId: string, amount: Kopecks, note = ''): Promise<Transaction> {
        const draft: TransactionDraft = {
          type: 'saving',
          amount,
          date: clock.today(),
          categoryId: null,
          goalId,
          note,
        };
        assertValidTransaction(draft);
        return repos.transactions.create(draft);
      },
    },

    recurring: {
      list: () => repos.recurring.list(),
      save: (draft: RecurringDraft, id?: string) =>
        id ? repos.recurring.update(id, draft) : repos.recurring.create(draft),
      remove: (id: string) => repos.recurring.remove(id),
    },

    settings: {
      get: () => repos.settings.get(),
      async save(settings: BudgetSettings): Promise<BudgetSettings> {
        const parsed = settingsSchema.safeParse(settings);
        if (!parsed.success) throw new AppError('Настройки вне допустимых значений', 'settings');
        return repos.settings.save(parsed.data);
      },
    },
  };
}

export type UseCases = ReturnType<typeof createUseCases>;
