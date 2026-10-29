import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { newPasswordSchema, type NewPasswordValues } from '@/application';
import { Button } from '@/ui/shared/components/Button';
import { Field, FormError, TextInput } from '@/ui/shared/components/Field';
import { useContainer } from '@/ui/shared/container';
import { useToast } from '@/ui/shared/toast/ToastProvider';
import styles from './NewPasswordForm.module.css';

interface NewPasswordFormProps {
  /** Почта аккаунта: по ней менеджер паролей поймёт, к какому входу сохранить пароль. */
  readonly email: string | null;
  readonly hint?: string;
  readonly onDone: () => void;
}

/** Новый пароль текущего аккаунта — после входа по ссылке из письма и в настройках. */
export function NewPasswordForm({ email, hint, onDone }: NewPasswordFormProps) {
  const { auth } = useContainer();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '' },
  });

  const submit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await auth.updatePassword(password);
      toast.show({ message: 'Пароль сохранён', tone: 'success' });
      onDone();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не получилось — попробуй ещё раз');
    }
  });

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {hint && <p className={styles.hint}>{hint}</p>}
      {email && <input type="email" autoComplete="username" value={email} readOnly hidden />}
      <Field label="Новый пароль" error={errors.password?.message}>
        {(props) => (
          <TextInput
            type="password"
            autoComplete="new-password"
            placeholder="Минимум 6 символов"
            data-autofocus="true"
            {...props}
            {...register('password')}
          />
        )}
      </Field>
      <FormError>{formError}</FormError>
      <Button type="submit" size="lg" block loading={isSubmitting}>
        Сохранить пароль
      </Button>
    </form>
  );
}
