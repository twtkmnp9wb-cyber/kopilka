import { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, LogOut, Plus } from 'lucide-react';
import { SETTINGS_LIMITS, formatMoney, type Category, type RecurringItem } from '@/domain';
import { useMode } from '@/ui/app/mode';
import { useSession } from '@/ui/app/session';
import { CategoryBadge } from '@/ui/shared/category-visuals';
import { Button, IconButton } from '@/ui/shared/components/Button';
import { Card } from '@/ui/shared/components/Card';
import { SegmentedControl } from '@/ui/shared/components/SegmentedControl';
import { Sheet } from '@/ui/shared/components/Sheet';
import { ErrorState, PageSkeleton } from '@/ui/shared/components/States';
import { useContainer } from '@/ui/shared/container';
import { queryKeys, useFinanceMutation, useSnapshot } from '@/ui/shared/data/queries';
import { cx } from '@/ui/shared/lib/cx';
import { useTheme, type ThemeChoice } from '@/ui/shared/theme';
import { useToast } from '@/ui/shared/toast/ToastProvider';
import { CategoryForm } from './CategoryForm';
import { RecurringForm } from './RecurringForm';
import styles from './SettingsPage.module.css';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'dark', label: 'Тёмная' },
  { value: 'light', label: 'Светлая' },
  { value: 'system', label: 'Как в системе' },
];

type Editing =
  | { kind: 'recurring'; item?: RecurringItem }
  | { kind: 'category'; item?: Category; categoryKind: 'income' | 'expense' }
  | null;

function CushionSetting({ value, forecastMonths }: { value: number; forecastMonths: number }) {
  const [draft, setDraft] = useState(value);
  const save = useFinanceMutation(
    (useCases, cushionPercent: number) =>
      useCases.settings.save({ cushionPercent, forecastMonths }),
    [queryKeys.settings],
  );
  const saveRef = useRef(save.mutate);
  saveRef.current = save.mutate;
  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => saveRef.current(draft), 600);
    return () => window.clearTimeout(timer);
  }, [draft, value]);

  return (
    <div className={styles.cushion}>
      <div className={styles.cushionHead}>
        <label htmlFor="cushion">Подушка безопасности</label>
        <b className="num">{draft}% дохода</b>
      </div>
      <input
        id="cushion"
        type="range"
        min={SETTINGS_LIMITS.cushionPercent.min}
        max={SETTINGS_LIMITS.cushionPercent.max}
        step={1}
        value={draft}
        onChange={(event) => setDraft(Number(event.target.value))}
      />
      <p className={styles.hint}>
        Столько от дохода каждый месяц откладывается «на всякий случай» до распределения лимитов на
        категории.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const { snapshot, isPending, error, retry } = useSnapshot();
  const { theme, setTheme } = useTheme();
  const { mode, exitDemo } = useMode();
  const { auth } = useContainer();
  const session = useSession();
  const toast = useToast();
  const [editing, setEditing] = useState<Editing>(null);

  const setCategoryArchived = useFinanceMutation(
    (useCases, { id, archived }: { id: string; archived: boolean }) =>
      useCases.categories.setArchived(id, archived),
    [queryKeys.categories],
  );

  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (isPending || !snapshot) return <PageSkeleton />;

  const categoriesById = new Map(snapshot.categories.map((c) => [c.id, c]));
  const incomeItems = snapshot.recurring.filter((r) => r.kind === 'income');
  const expenseItems = snapshot.recurring.filter((r) => r.kind === 'expense');

  const signOut = async () => {
    try {
      if (mode === 'demo') await exitDemo();
      else await auth.signOut();
    } catch (err) {
      toast.error(err);
    }
  };

  const recurringList = (items: RecurringItem[], empty: string) =>
    items.length === 0 ? (
      <p className={styles.hint}>{empty}</p>
    ) : (
      <ul className={styles.list}>
        {items.map((item) => {
          const category = item.categoryId ? categoriesById.get(item.categoryId) : undefined;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cx(styles.row, !item.active && styles.inactive)}
                onClick={() => setEditing({ kind: 'recurring', item })}
              >
                <CategoryBadge
                  icon={category?.icon ?? (item.kind === 'income' ? 'wallet' : 'repeat')}
                  color={category?.color ?? 'neutral'}
                  size={36}
                />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{item.name}</span>
                  <span className={styles.rowHint}>
                    {item.dayOfMonth}-го числа{category ? ` · ${category.name}` : ''}
                    {!item.active && ' · на паузе'}
                  </span>
                </span>
                <span
                  className={cx(styles.rowAmount, 'num', item.kind === 'income' && styles.income)}
                >
                  {item.kind === 'income' ? '+' : '−'}
                  {formatMoney(item.amount)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );

  const categoryList = (kind: 'income' | 'expense') => (
    <ul className={styles.list}>
      {snapshot.categories
        .filter((c) => c.kind === kind)
        .sort((a, b) => Number(a.archived) - Number(b.archived) || a.sort - b.sort)
        .map((category) => (
          <li key={category.id} className={styles.categoryItem}>
            <button
              type="button"
              className={cx(styles.row, category.archived && styles.inactive)}
              onClick={() => setEditing({ kind: 'category', item: category, categoryKind: kind })}
            >
              <CategoryBadge icon={category.icon} color={category.color} size={36} />
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{category.name}</span>
                {(category.essential || category.archived) && (
                  <span className={styles.rowHint}>
                    {category.archived ? 'в архиве' : 'обязательная'}
                  </span>
                )}
              </span>
            </button>
            <IconButton
              label={category.archived ? 'Вернуть из архива' : 'В архив'}
              onClick={() =>
                setCategoryArchived.mutate({ id: category.id, archived: !category.archived })
              }
            >
              {category.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
            </IconButton>
          </li>
        ))}
    </ul>
  );

  return (
    <div className={styles.grid}>
      <Card
        title="Регулярные доходы и платежи"
        subtitle="Из них Копилка считает ожидаемый доход и обязательные траты месяца"
        action={
          <IconButton
            label="Добавить регулярный платёж"
            onClick={() => setEditing({ kind: 'recurring' })}
          >
            <Plus size={20} />
          </IconButton>
        }
      >
        <h3 className={styles.subheading}>Доходы</h3>
        {recurringList(incomeItems, 'Зарплата, стипендия, подработка — что приходит каждый месяц.')}
        <h3 className={styles.subheading}>Обязательные платежи</h3>
        {recurringList(expenseItems, 'Аренда, связь, подписки — то, что нельзя не заплатить.')}
      </Card>

      <Card title="Бюджет">
        <CushionSetting
          key={snapshot.settings.cushionPercent}
          value={snapshot.settings.cushionPercent}
          forecastMonths={snapshot.settings.forecastMonths}
        />
      </Card>

      <Card
        title="Категории расходов"
        subtitle="Обязательные не расходуют свободный лимит"
        action={
          <IconButton
            label="Добавить категорию расходов"
            onClick={() => setEditing({ kind: 'category', categoryKind: 'expense' })}
          >
            <Plus size={20} />
          </IconButton>
        }
      >
        {categoryList('expense')}
      </Card>

      <Card
        title="Категории доходов"
        action={
          <IconButton
            label="Добавить категорию доходов"
            onClick={() => setEditing({ kind: 'category', categoryKind: 'income' })}
          >
            <Plus size={20} />
          </IconButton>
        }
      >
        {categoryList('income')}
      </Card>

      <Card title="Оформление">
        <SegmentedControl label="Тема" options={THEMES} value={theme} onChange={setTheme} />
      </Card>

      <Card title="Аккаунт">
        <p className={styles.account}>
          {mode === 'demo'
            ? 'Демо-режим: данные хранятся только в этом браузере и сотрутся при выходе.'
            : `Вход выполнен: ${session?.email ?? 'без почты'}`}
        </p>
        <Button variant="secondary" icon={<LogOut size={18} />} onClick={() => void signOut()}>
          {mode === 'demo' ? 'Выйти из демо' : 'Выйти'}
        </Button>
      </Card>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing?.kind === 'recurring'
            ? editing.item
              ? 'Регулярный платёж'
              : 'Новый регулярный платёж'
            : editing?.item
              ? 'Категория'
              : 'Новая категория'
        }
      >
        {editing?.kind === 'recurring' && (
          <RecurringForm
            item={editing.item}
            categories={snapshot.categories}
            onDone={() => setEditing(null)}
          />
        )}
        {editing?.kind === 'category' && (
          <CategoryForm
            category={editing.item}
            kind={editing.categoryKind}
            nextSort={snapshot.categories.length}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
