import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { passwordResetSchema, type PasswordResetValues } from '@/application';
import { Button } from '@/ui/shared/components/Button';
import { Field, FormError, TextInput } from '@/ui/shared/components/Field';
import { useContainer } from '@/ui/shared/container';
import styles from './AuthPage.module.css';

interface PasswordResetFormProps {
  readonly defaultEmail: string;
  readonly onSent: (email: string) => void;
  readonly onBack: () => void;
}

/** «Забыл пароль»: письмо со ссылкой, которая впустит в аккаунт и попросит новый пароль. */
export function PasswordResetForm({ defaultEmail, onSent, onBack }: PasswordResetFormProps) {
  const { auth } = useContainer();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: defaultEmail },
  });

  const submit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await auth.requestPasswordReset(email);
      onSent(email);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не получилось — попробуй ещё раз');
    }
  });

  return (
    <>
      <h1 className={styles.title}>Восстановить пароль</h1>
      <p className={styles.subtitle}>
        Пришлём на почту ссылку — по ней войдёшь в Копилку и задашь новый пароль.
      </p>
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label="Почта" error={errors.email?.message}>
          {(props) => (
            <TextInput
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              {...props}
              {...register('email')}
            />
          )}
        </Field>
        <FormError>{formError}</FormError>
        <Button type="submit" size="lg" block loading={isSubmitting}>
          Прислать ссылку
        </Button>
      </form>
      <Button variant="ghost" block onClick={onBack}>
        Назад ко входу
      </Button>
    </>
  );
}
