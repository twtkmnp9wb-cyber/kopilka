import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { FinanceSnapshot, UseCases } from '@/application';
import type { Transaction, TransactionDraft } from '@/domain';
import { useUseCases } from '../container';
import { useToast } from '../toast/ToastProvider';

export const queryKeys = {
  all: ['finance'] as const,
  categories: ['finance', 'categories'] as const,
  transactions: ['finance', 'transactions'] as const,
  goals: ['finance', 'goals'] as const,
  recurring: ['finance', 'recurring'] as const,
  settings: ['finance', 'settings'] as const,
};

export const useCategories = () => {
  const useCases = useUseCases();
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => useCases.categories.listOrSeed(),
  });
};

export const useTransactions = () => {
  const useCases = useUseCases();
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => useCases.transactions.list(),
  });
};

export const useGoals = () => {
  const useCases = useUseCases();
  return useQuery({ queryKey: queryKeys.goals, queryFn: () => useCases.goals.list() });
};

export const useRecurring = () => {
  const useCases = useUseCases();
  return useQuery({ queryKey: queryKeys.recurring, queryFn: () => useCases.recurring.list() });
};

export const useSettings = () => {
  const useCases = useUseCases();
  return useQuery({ queryKey: queryKeys.settings, queryFn: () => useCases.settings.get() });
};

export interface SnapshotState {
  readonly snapshot: FinanceSnapshot | undefined;
  readonly isPending: boolean;
  readonly error: Error | null;
  retry(): void;
}

/** Все данные пользователя одним снимком — из него строятся экраны. */
export function useSnapshot(): SnapshotState {
  const categories = useCategories();
  const transactions = useTransactions();
  const goals = useGoals();
  const recurring = useRecurring();
  const settings = useSettings();
  const queries = [categories, transactions, goals, recurring, settings];

  const snapshot = useMemo<FinanceSnapshot | undefined>(() => {
    if (
      !categories.data ||
      !transactions.data ||
      !goals.data ||
      !recurring.data ||
      !settings.data
    ) {
      return undefined;
    }
    return {
      categories: categories.data,
      transactions: transactions.data,
      goals: goals.data,
      recurring: recurring.data,
      settings: settings.data,
    };
  }, [categories.data, transactions.data, goals.data, recurring.data, settings.data]);

  return {
    snapshot,
    isPending: !snapshot && queries.some((q) => q.isPending),
    error: queries.find((q) => q.error)?.error ?? null,
    retry: () => {
      for (const q of queries) if (q.error) void q.refetch();
    },
  };
}

/**
 * Обёртка мутации: ошибки показываются тостом, после успеха перечитываются
 * затронутые коллекции. Сценарий берётся из контейнера текущего режима.
 */
export function useFinanceMutation<TVariables, TResult>(
  run: (useCases: UseCases, variables: TVariables) => Promise<TResult>,
  invalidate: readonly QueryKey[],
) {
  const useCases = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (variables: TVariables) => run(useCases, variables),
    onError: (error) => toast.error(error),
    onSettled: () =>
      Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

/** Сохранение операции с оптимистичным обновлением: список меняется ещё до ответа сервера. */
export function useSaveTransaction() {
  const useCases = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ draft, id }: { draft: TransactionDraft; id?: string }) =>
      useCases.transactions.save(draft, id),
    onMutate: async ({ draft, id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });
      const previous = queryClient.getQueryData<Transaction[]>(queryKeys.transactions);
      queryClient.setQueryData<Transaction[]>(queryKeys.transactions, (list = []) =>
        id
          ? list.map((t) => (t.id === id ? { ...draft, id } : t))
          : [{ ...draft, id: `optimistic-${Date.now()}` }, ...list],
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.transactions, context.previous);
      toast.error(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
  });
}

/** Удаление операции с возможностью отменить его из тоста. */
export function useRemoveTransaction() {
  const useCases = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (transaction: Transaction) => useCases.transactions.remove(transaction.id),
    onMutate: async (transaction) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });
      const previous = queryClient.getQueryData<Transaction[]>(queryKeys.transactions);
      queryClient.setQueryData<Transaction[]>(queryKeys.transactions, (list = []) =>
        list.filter((t) => t.id !== transaction.id),
      );
      return { previous };
    },
    onSuccess: (_result, transaction) => {
      toast.show({
        message: 'Операция удалена',
        action: {
          label: 'Отменить',
          onClick: () => {
            void useCases.transactions
              .restore(transaction)
              .catch((error: unknown) => toast.error(error))
              .finally(() => queryClient.invalidateQueries({ queryKey: queryKeys.transactions }));
          },
        },
      });
    },
    onError: (error, _transaction, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.transactions, context.previous);
      toast.error(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
  });
}
