import { createContext, use, useMemo, useState, type ReactNode } from 'react';
import { addMonths, monthOf, type IsoDate, type MonthKey } from '@/domain';
import { useContainer } from './container';

interface PeriodContextValue {
  readonly today: IsoDate;
  readonly currentMonth: MonthKey;
  readonly month: MonthKey;
  setMonth(month: MonthKey): void;
  shift(delta: number): void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

/** Выбранный месяц — общий для главной, операций и плана. */
export function PeriodProvider({ children }: { children: ReactNode }) {
  const { useCases } = useContainer();
  const today = useCases.clock.today();
  const currentMonth = monthOf(today);
  const [month, setMonth] = useState<MonthKey>(currentMonth);

  const value = useMemo(
    () => ({
      today,
      currentMonth,
      month,
      setMonth,
      shift: (delta: number) => setMonth((m) => addMonths(m, delta)),
    }),
    [today, currentMonth, month],
  );
  return <PeriodContext value={value}>{children}</PeriodContext>;
}

export function usePeriod(): PeriodContextValue {
  const context = use(PeriodContext);
  if (!context) throw new Error('usePeriod вне PeriodProvider');
  return context;
}
