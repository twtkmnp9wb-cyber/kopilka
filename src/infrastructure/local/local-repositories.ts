import type { Repositories } from '@/application';
import type {
  Category,
  CategoryDraft,
  Goal,
  GoalDraft,
  RecurringDraft,
  RecurringItem,
  Transaction,
  TransactionDraft,
} from '@/domain';
import type { KeyValueStore } from '../storage/key-value-store';
import { LocalCrudRepository, LocalSettingsRepository } from './local-repository';

export interface LocalRepositories extends Repositories {
  readonly transactions: LocalCrudRepository<Transaction, TransactionDraft>;
  readonly categories: LocalCrudRepository<Category, CategoryDraft>;
  readonly goals: LocalCrudRepository<Goal, GoalDraft>;
  readonly recurring: LocalCrudRepository<RecurringItem, RecurringDraft>;
  /** Стереть все коллекции с этим префиксом. */
  clear(): void;
}

/**
 * Репозитории поверх key-value стора с теми же связями, что и в базе:
 * удаление цели удаляет её переводы, удаление категории обнуляет ссылки на неё.
 */
export function createLocalRepositories(store: KeyValueStore, prefix: string): LocalRepositories {
  const key = (name: string) => `${prefix}:${name}`;

  const transactions = new LocalCrudRepository<Transaction, TransactionDraft>(
    store,
    key('transactions'),
  );
  const recurring = new LocalCrudRepository<RecurringItem, RecurringDraft>(store, key('recurring'));
  const goals = new LocalCrudRepository<Goal, GoalDraft>(store, key('goals'), {
    onRemove: (goalId) =>
      transactions.write(transactions.read().filter((t) => t.goalId !== goalId)),
  });
  const categories = new LocalCrudRepository<Category, CategoryDraft>(store, key('categories'), {
    onRemove: (categoryId) => {
      transactions.write(
        transactions
          .read()
          .map((t) => (t.categoryId === categoryId ? { ...t, categoryId: null } : t)),
      );
      recurring.write(
        recurring.read().map((r) => (r.categoryId === categoryId ? { ...r, categoryId: null } : r)),
      );
    },
  });
  const settings = new LocalSettingsRepository(store, key('settings'));

  return {
    transactions,
    categories,
    goals,
    recurring,
    settings,
    clear() {
      for (const name of ['transactions', 'categories', 'goals', 'recurring', 'settings']) {
        store.remove(key(name));
      }
    },
  };
}
