import { useDeferredValue, useMemo, useState } from 'react';
import { ReceiptText, Search } from 'lucide-react';
import { groupByDay } from '@/application';
import { formatDayHeading, formatMoney, monthOf, type Transaction } from '@/domain';
import { Button } from '@/ui/shared/components/Button';
import { Chip } from '@/ui/shared/components/Chip';
import { EmptyState, ErrorState, PageSkeleton } from '@/ui/shared/components/States';
import { useRemoveTransaction, useSnapshot } from '@/ui/shared/data/queries';
import { cx } from '@/ui/shared/lib/cx';
import { usePeriod } from '@/ui/shared/period';
import { TransactionRow } from './TransactionRow';
import { useTransactionSheet } from './TransactionSheetProvider';
import styles from './TransactionsPage.module.css';

type TypeFilter = 'all' | 'income' | 'expense' | 'saving';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
  { value: 'saving', label: 'Цели' },
];

export default function TransactionsPage() {
  const { snapshot, isPending, error, retry } = useSnapshot();
  const { month, today } = usePeriod();
  const sheet = useTransactionSheet();
  const remove = useRemoveTransaction();
  const [type, setType] = useState<TypeFilter>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const categoriesById = useMemo(
    () => new Map((snapshot?.categories ?? []).map((c) => [c.id, c])),
    [snapshot?.categories],
  );
  const goalsById = useMemo(
    () => new Map((snapshot?.goals ?? []).map((g) => [g.id, g])),
    [snapshot?.goals],
  );

  const inMonth = useMemo(
    () => (snapshot?.transactions ?? []).filter((t) => monthOf(t.date) === month),
    [snapshot?.transactions, month],
  );

  const usedCategories = useMemo(() => {
    const ids = new Set(inMonth.map((t) => t.categoryId).filter(Boolean));
    return [...categoriesById.values()].filter((c) => ids.has(c.id));
  }, [inMonth, categoriesById]);

  const groups = useMemo(() => {
    const matches = (t: Transaction) => {
      if (type !== 'all' && t.type !== type) return false;
      if (categoryId && t.categoryId !== categoryId) return false;
      if (!deferredQuery) return true;
      const haystack = [
        t.note,
        t.categoryId ? categoriesById.get(t.categoryId)?.name : '',
        t.goalId ? goalsById.get(t.goalId)?.name : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(deferredQuery);
    };
    return groupByDay(inMonth.filter(matches));
  }, [inMonth, type, categoryId, deferredQuery, categoriesById, goalsById]);

  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (isPending || !snapshot) return <PageSkeleton />;

  const filtered = type !== 'all' || categoryId !== null || deferredQuery !== '';

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={18} aria-hidden />
          <span className="visually-hidden">Поиск по операциям</span>
          <input
            type="search"
            placeholder="Поиск по заметкам и категориям"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className={styles.chips} role="group" aria-label="Фильтр по типу">
          {TYPE_FILTERS.map((filter) => (
            <Chip
              key={filter.value}
              selected={type === filter.value}
              onClick={() => setType(filter.value)}
            >
              {filter.label}
            </Chip>
          ))}
          {usedCategories.length > 0 && <span className={styles.divider} aria-hidden />}
          {usedCategories.map((category) => (
            <Chip
              key={category.id}
              selected={categoryId === category.id}
              onClick={() =>
                setCategoryId((current) => (current === category.id ? null : category.id))
              }
            >
              {category.name}
            </Chip>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          illustration={<ReceiptText size={30} />}
          title={filtered ? 'Ничего не нашлось' : 'В этом месяце операций нет'}
          text={
            filtered
              ? 'Попробуй убрать фильтры или изменить запрос.'
              : 'Добавляй доходы и траты — по ним строятся графики и бюджет.'
          }
          action={!filtered && <Button onClick={() => sheet.open()}>Добавить операцию</Button>}
        />
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <section
              key={group.date}
              className={styles.group}
              aria-label={formatDayHeading(group.date, today)}
            >
              <header className={styles.groupHeader}>
                <h2>{formatDayHeading(group.date, today)}</h2>
                <span className={cx(styles.groupTotal, 'num')}>
                  {group.income > 0 && (
                    <span className={styles.plus}>
                      {formatMoney(group.income, { signed: true })}
                    </span>
                  )}
                  {group.expense > 0 && <span>−{formatMoney(group.expense)}</span>}
                </span>
              </header>
              <ul className={styles.list}>
                {group.items.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    category={
                      transaction.categoryId
                        ? categoriesById.get(transaction.categoryId)
                        : undefined
                    }
                    goal={transaction.goalId ? goalsById.get(transaction.goalId) : undefined}
                    onOpen={() => sheet.open({ transaction })}
                    onDelete={() => remove.mutate(transaction)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
