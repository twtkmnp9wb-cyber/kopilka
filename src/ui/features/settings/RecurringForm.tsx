import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { recurringFormSchema, type RecurringFormValues } from '@/application';
import { toRubles, type Category, type RecurringDraft, type RecurringItem } from '@/domain';
import { Button } from '@/ui/shared/components/Button';
import { Chip } from '@/ui/shared/components/Chip';
import { Field, FormError, MoneyInput, TextInput } from '@/ui/shared/components/Field';
import { SegmentedControl } from '@/ui/shared/components/SegmentedControl';
import { queryKeys, useFinanceMutation } from '@/ui/shared/data/queries';
import styles from './SettingsForms.module.css';

interface RecurringFormProps {
  readonly item?: RecurringItem;
  readonly categories: readonly Category[];
  readonly onDone: () => void;
}

export function RecurringForm({ item, categories, onDone }: RecurringFormProps) {
  const save = useFinanceMutation(
    (useCases, draft: RecurringDraft) => useCases.recurring.save(draft, item?.id),
    [queryKeys.recurring],
  );
  const remove = useFinanceMutation(
    (useCases, id: string) => useCases.recurring.remove(id),
    [queryKeys.recurring],
  );

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RecurringFormValues, unknown, RecurringDraft>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: {
      kind: item?.kind ?? 'income',
      name: item?.name ?? '',
      amount: item ? String(toRubles(item.amount)).replace('.', ',') : '',
      dayOfMonth: item?.dayOfMonth ?? 1,
      categoryId: item?.categoryId ?? null,
      active: item?.active ?? true,
    },
  });
  const kind = useWatch({ control, name: 'kind' });
  // Обязательный платёж привязывается к обязательной категории — так он не съедает свободный лимит.
  const options = categories.filter(
    (c) => !c.archived && c.kind === kind && (kind === 'income' || c.essential),
  );

  const submit = handleSubmit((draft) => save.mutate(draft, { onSuccess: onDone }));

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <SegmentedControl
            label="Тип"
            options={[
              { value: 'income', label: 'Доход' },
              { value: 'expense', label: 'Обязательный платёж' },
            ]}
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              setValue('categoryId', null);
            }}
          />
        )}
      />

      <div className={styles.amount}>
        <label htmlFor="rec-amount" className={styles.label}>
          Сумма в месяц
        </label>
        <MoneyInput id="rec-amount" data-autofocus={!item} {...register('amount')} />
        <FormError>{errors.amount?.message}</FormError>
      </div>

      <div className={styles.row}>
        <Field label="Название" error={errors.name?.message}>
          {(props) => (
            <TextInput
              placeholder={kind === 'income' ? 'Зарплата' : 'Аренда'}
              maxLength={60}
              {...props}
              {...register('name')}
            />
          )}
        </Field>
        <Field label="Число месяца" error={errors.dayOfMonth?.message}>
          {(props) => (
            <TextInput
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              {...props}
              {...register('dayOfMonth')}
            />
          )}
        </Field>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>
          Категория{kind === 'expense' ? ' (только обязательные)' : ''}
        </span>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <div className={styles.chips}>
              {options.map((category) => (
                <Chip
                  key={category.id}
                  selected={field.value === category.id}
                  onClick={() => field.onChange(field.value === category.id ? null : category.id)}
                >
                  {category.name}
                </Chip>
              ))}
            </div>
          )}
        />
        <FormError>{errors.categoryId?.message}</FormError>
      </div>

      <label className={styles.toggle}>
        <input type="checkbox" {...register('active')} />
        <span>Учитывать в плане</span>
      </label>

      <div className={styles.actions}>
        {item && (
          <Button
            variant="danger"
            icon={<Trash2 size={18} />}
            onClick={() => remove.mutate(item.id, { onSuccess: onDone })}
          >
            Удалить
          </Button>
        )}
        <Button type="submit" size="lg" block loading={save.isPending}>
          {item ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}
