import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { goalFormSchema, type GoalFormValues } from '@/application';
import { addMonths, lastDayOf, monthOf, toRubles, type Goal, type GoalDraft } from '@/domain';
import { Button } from '@/ui/shared/components/Button';
import { Field, MoneyInput, TextInput, FormError } from '@/ui/shared/components/Field';
import { queryKeys, useFinanceMutation } from '@/ui/shared/data/queries';
import { cx } from '@/ui/shared/lib/cx';
import { usePeriod } from '@/ui/shared/period';
import styles from './GoalForm.module.css';

const EMOJI = [
  '🎯',
  '💻',
  '📱',
  '✈️',
  '🚆',
  '🏖️',
  '🛟',
  '🎓',
  '🚗',
  '🏠',
  '🎸',
  '🎮',
  '🎁',
  '💍',
  '🚲',
  '📷',
];

export function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const { today } = usePeriod();
  const save = useFinanceMutation(
    (useCases, draft: GoalDraft) => useCases.goals.save(draft, goal?.id),
    [queryKeys.goals],
  );

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormValues, unknown, GoalDraft>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: goal?.name ?? '',
      emoji: goal?.emoji ?? '🎯',
      target: goal ? String(toRubles(goal.target)).replace('.', ',') : '',
      deadline: goal?.deadline ?? lastDayOf(addMonths(monthOf(today), 6)),
      createdOn: goal?.createdOn ?? today,
    },
  });

  const submit = handleSubmit((draft) => {
    save.mutate({ ...draft, archived: goal?.archived ?? false }, { onSuccess: onDone });
  });

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.amount}>
        <label htmlFor="goal-target" className={styles.amountLabel}>
          Сколько накопить
        </label>
        <MoneyInput
          id="goal-target"
          data-autofocus={!goal}
          aria-invalid={errors.target ? true : undefined}
          {...register('target')}
        />
        <FormError>{errors.target?.message}</FormError>
      </div>

      <Field label="Название" error={errors.name?.message}>
        {(props) => (
          <TextInput
            placeholder="Например, ноутбук"
            maxLength={60}
            {...props}
            {...register('name')}
          />
        )}
      </Field>

      <div className={styles.section}>
        <span className={styles.label}>Значок</span>
        <Controller
          control={control}
          name="emoji"
          render={({ field }) => (
            <div className={styles.emoji} role="radiogroup" aria-label="Значок цели">
              {EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  role="radio"
                  aria-checked={field.value === emoji}
                  className={cx(styles.emojiButton, field.value === emoji && styles.selected)}
                  onClick={() => field.onChange(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <Field
        label="Срок"
        error={errors.deadline?.message}
        hint="От срока зависит, сколько откладывать в месяц."
      >
        {(props) => <TextInput type="date" min={today} {...props} {...register('deadline')} />}
      </Field>

      <Button type="submit" size="lg" block loading={save.isPending}>
        {goal ? 'Сохранить' : 'Создать цель'}
      </Button>
    </form>
  );
}
