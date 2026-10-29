import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Transaction, TransactionType } from '@/domain';
import { Sheet } from '@/ui/shared/components/Sheet';
import { TransactionForm } from './TransactionForm';

export interface TransactionSheetOptions {
  /** Редактирование существующей операции. */
  readonly transaction?: Transaction;
  readonly type?: TransactionType;
  readonly goalId?: string;
}

interface TransactionSheetApi {
  open(options?: TransactionSheetOptions): void;
}

const TransactionSheetContext = createContext<TransactionSheetApi | null>(null);

/** Лист добавления операции доступен с любого экрана: кнопка «+» и строки списка. */
export function TransactionSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; options: TransactionSheetOptions }>({
    open: false,
    options: {},
  });
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const api = useMemo<TransactionSheetApi>(
    () => ({ open: (options = {}) => setState({ open: true, options }) }),
    [],
  );

  return (
    <TransactionSheetContext value={api}>
      {children}
      <Sheet
        open={state.open}
        onClose={close}
        title={state.options.transaction ? 'Операция' : 'Новая операция'}
      >
        <TransactionForm options={state.options} onDone={close} />
      </Sheet>
    </TransactionSheetContext>
  );
}

export function useTransactionSheet(): TransactionSheetApi {
  const context = use(TransactionSheetContext);
  if (!context) throw new Error('useTransactionSheet вне TransactionSheetProvider');
  return context;
}
