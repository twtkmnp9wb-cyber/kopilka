import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { categoryFormSchema, type CategoryFormValues } from '@/application';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type Category,
  type CategoryDraft,
  type FlowKind,
} from '@/domain';
import {
  CATEGORY_ICON_COMPONENTS,
  COLOR_LABELS,
  CategoryBadge,
  categoryColorVar,
} from '@/ui/shared/category-visuals';
import { Button } from '@/ui/shared/components/Button';
import { Field, TextInput } from '@/ui/shared/components/Field';
import { queryKeys, useFinanceMutation } from '@/ui/shared/data/queries';
import { cx } from '@/ui/shared/lib/cx';
import styles from './SettingsForms.module.css';

interface CategoryFormProps {
  readonly category?: Category;
  readonly kind: FlowKind;
  readonly nextSort: number;
  readonly onDone: () => void;
}

export function CategoryForm({ category, kind, nextSort, onDone }: CategoryFormProps) {
  const save = useFinanceMutation(
    (useCases, draft: CategoryDraft) =>
      useCases.categories.save({ ...draft, archived: category?.archived ?? false }, category?.id),
    [queryKeys.categories],
  );
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues, unknown, CategoryDraft>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? '',
      kind,
      essential: category?.essential ?? false,
      color: category?.color ?? 'blue',
      icon: category?.icon ?? 'more',
      sort: category?.sort ?? nextSort,
    },
  });
  const [color, icon, name] = useWatch({ control, name: ['color', 'icon', 'name'] });

  const submit = handleSubmit((draft) => save.mutate(draft, { onSuccess: onDone }));

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.preview}>
        <CategoryBadge icon={icon} color={color} size={56} />
        <span className={styles.previewName}>{name || 'Новая категория'}</span>
      </div>

      <Field label="Название" error={errors.name?.message}>
        {(props) => (
          <TextInput data-autofocus={!category} maxLength={40} {...props} {...register('name')} />
        )}
      </Field>

      <div className={styles.section}>
        <span className={styles.label}>Цвет</span>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <div className={styles.swatches} role="radiogroup" aria-label="Цвет">
              {CATEGORY_COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === value}
                  aria-label={COLOR_LABELS[value]}
                  className={cx(styles.swatch, field.value === value && styles.selectedSwatch)}
                  style={{ background: categoryColorVar(value) }}
                  onClick={() => field.onChange(value)}
                />
              ))}
            </div>
          )}
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Иконка</span>
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <div className={styles.icons} role="radiogroup" aria-label="Иконка">
              {CATEGORY_ICONS.map((value) => {
                const Icon = CATEGORY_ICON_COMPONENTS[value];
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === value}
                    aria-label={value}
                    className={cx(styles.iconButton, field.value === value && styles.selectedIcon)}
                    onClick={() => field.onChange(value)}
                  >
                    <Icon size={20} aria-hidden />
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      {kind === 'expense' && (
        <label className={styles.toggle}>
          <input type="checkbox" {...register('essential')} />
          <span>
            Обязательная — аренда, связь, подписки. Такие траты планируются регулярными платежами и
            не уменьшают «можно тратить сегодня».
          </span>
        </label>
      )}

      <Button type="submit" size="lg" block loading={save.isPending}>
        {category ? 'Сохранить' : 'Добавить категорию'}
      </Button>
    </form>
  );
}
