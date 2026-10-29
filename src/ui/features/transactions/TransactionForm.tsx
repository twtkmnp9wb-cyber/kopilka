import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { transactionFormSchema, type TransactionFormValues } from '@/application';
import {
  toRubles,
  type Category,
  type Transaction,
  type TransactionDraft,
  type TransactionType,
} from '@/domain';
import { Button } from '@/ui/shared/components/Button';
import { Chip } from '@/ui/shared/components/Chip';
import { Field, FormError, MoneyInput, TextInput } from '@/ui/shared/components/Field';
import { SegmentedControl } from '@/ui/shared/components/SegmentedControl';
import { CategoryBadge } from '@/ui/shared/category-visuals';
import {
  useCategories,
  useGoals,
  useRemoveTransaction,
  useSaveTransaction,
  useTransactions,
} from '@/ui/shared/data/queries';
import { cx } from '@/ui/shared/lib/cx';
import { usePeriod } from '@/ui/shared/period';
import type { TransactionSheetOptions } from './TransactionSheetProvider';
import styles from './TransactionForm.module.css';

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
  { value: 'saving', label: 'В цель' },
];

const amountToInput = (amount: number) => String(toRubles(Math.abs(amount))).replace('.', ',');

function defaultsFor(options: TransactionSheetOptions, today: string): TransactionFormValues {
  const t = options.transaction;
  if (t) {
    return {
      type: t.type,
      amount: amountToInput(t.amount),
      date: t.date,
      categoryId: t.categoryId,
      goalId: t.goalId,
      withdraw: t.type === 'saving' && t.amount < 0,
      note: t.note,
    };
  }
  return {
    type: options.type ?? (options.goalId ? 'saving' : 'expense'),
    amount: '',
    date: today,
    categoryId: null,
    goalId: options.goalId ?? null,
    withdraw: false,
    note: '',
  };
}

/** Категории нужного типа: сначала недавно использованные, затем по порядку. */
function orderByRecentUse(
  categories: readonly Category[],
  transactions: readonly Transaction[],
  kind: 'income' | 'expense',
): Category[] {
  const lastUsed = new Map<string, string>();
  for (const t of transactions) {
    if (!t.categoryId) continue;
    const seen = lastUsed.get(t.categoryId);
    if (!seen || t.date > seen) lastUsed.set(t.categoryId, t.date);
  }
  return categories
    .filter((c) => c.kind === kind && !c.archived)
    .sort((a, b) => {
      const byUse = (lastUsed.get(b.id) ?? '').localeCompare(lastUsed.get(a.id) ?? '');
      return byUse || a.sort - b.sort;
    });
}

interface TransactionFormProps {
  readonly options: TransactionSheetOptions;
  readonly onDone: () => void;
}

export function TransactionForm({ options, onDone }: TransactionFormProps) {
  const { today } = usePeriod();
  const categories = useCategories();
  const goals = useGoals();
  const transactions = useTransactions();
  const save = useSaveTransaction();
  const remove = useRemoveTransaction();
  const editing = options.transaction;

  const form = useForm<TransactionFormValues, unknown, TransactionDraft>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaultsFor(options, today),
  });
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;
  const type = useWatch({ control, name: 'type' });

  const pickable = useMemo(
    () =>
      type === 'saving'
        ? []
        : orderByRecentUse(categories.data ?? [], transactions.data ?? [], type),
    [type, categories.data, transactions.data],
  );
  const activeGoals = (goals.data ?? []).filter((g) => !g.archived);

  const submit = handleSubmit((draft) => {
    save.mutate({ draft, id: editing?.id });
    onDone();
  });

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <SegmentedControl
            label="Тип операции"
            options={TYPE_OPTIONS}
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              setValue('categoryId', null);
            }}
          />
        )}
      />

      <div className={styles.amount}>
        <label htmlFor="tx-amount" className="visually-hidden">
          Сумма
        </label>
        <MoneyInput
          id="tx-amount"
          data-autofocus={!editing}
          aria-invalid={errors.amount ? true : undefined}
          {...register('amount')}
        />
        <FormError>{errors.amount?.message}</FormError>
      </div>

      {type === 'saving' ? (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Цель</span>
          {activeGoals.length === 0 ? (
            <p className={styles.hint}>Сначала создай цель в разделе «Цели».</p>
          ) : (
            <Controller
              control={control}
              name="goalId"
              render={({ field }) => (
                <div className={styles.chips} role="radiogroup" aria-label="Цель">
                  {activeGoals.map((goal) => (
                    <Chip
                      key={goal.id}
                      role="radio"
                      aria-checked={field.value === goal.id}
                      selected={field.value === goal.id}
                      onClick={() => field.onChange(goal.id)}
                    >
                      <span aria-hidden>{goal.emoji}</span> {goal.name}
                    </Chip>
                  ))}
                </div>
              )}
            />
          )}
          <FormError>{errors.goalId?.message}</FormError>
          <label className={styles.toggle}>
            <input type="checkbox" {...register('withdraw')} />
            <span>Забрать деньги из цели обратно</span>
          </label>
        </div>
      ) : (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Категория</span>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <div className={styles.categories} role="radiogroup" aria-label="Категория">
                {pickable.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    role="radio"
                    aria-checked={field.value === category.id}
                    className={cx(styles.category, field.value === category.id && styles.selected)}
                    onClick={() => field.onChange(category.id)}
                  >
                    <CategoryBadge icon={category.icon} color={category.color} size={42} />
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            )}
          />
          <FormError>{errors.categoryId?.message}</FormError>
        </div>
      )}

      <div className={styles.row}>
        <Field label="Дата" error={errors.date?.message}>
          {(props) => <TextInput type="date" max={today} {...props} {...register('date')} />}
        </Field>
        <Field label="Заметка" error={errors.note?.message}>
          {(props) => (
            <TextInput
              placeholder="Необязательно"
              maxLength={200}
              {...props}
              {...register('note')}
            />
          )}
        </Field>
      </div>

      <div className={styles.actions}>
        {editing && (
          <Button
            variant="danger"
            icon={<Trash2 size={18} />}
            onClick={() => {
              remove.mutate(editing);
              onDone();
            }}
          >
            Удалить
          </Button>
        )}
        <Button type="submit" size="lg" block>
          {editing ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}
