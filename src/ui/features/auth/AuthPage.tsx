import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck, PiggyBank } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { AppError, credentialsSchema, type Credentials } from '@/application';
import { useMode } from '@/ui/app/mode';
import { Button } from '@/ui/shared/components/Button';
import { Field, FormError, TextInput } from '@/ui/shared/components/Field';
import { SegmentedControl } from '@/ui/shared/components/SegmentedControl';
import { useContainer } from '@/ui/shared/container';
import styles from './AuthPage.module.css';

type Tab = 'sign-in' | 'sign-up';

export default function AuthPage() {
  const { auth } = useContainer();
  const { enterDemo } = useMode();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'sign-up' ? 'sign-up' : 'sign-in');
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      if (tab === 'sign-in') {
        await auth.signIn(email, password);
      } else {
        const result = await auth.signUp(email, password);
        if (result.status === 'confirm-email') setSentTo(email);
      }
    } catch (error) {
      if (error instanceof AppError && error.code === 'user-exists') setTab('sign-in');
      setFormError(error instanceof Error ? error.message : 'Не получилось — попробуй ещё раз');
    }
  });

  return (
    <div className={styles.page}>
      <Link to="/welcome" className={styles.back}>
        <ArrowLeft size={18} aria-hidden /> На главную
      </Link>

      <div className={styles.card}>
        <div className={styles.logo} aria-hidden>
          <PiggyBank size={30} />
        </div>

        {sentTo ? (
          <div className={styles.sent}>
            <MailCheck size={36} aria-hidden className={styles.sentIcon} />
            <h1>Проверь почту</h1>
            <p>
              Мы отправили письмо на <b>{sentTo}</b>. Перейди по ссылке из него — и сразу попадёшь в
              Копилку.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSentTo(null);
                setTab('sign-in');
              }}
            >
              Уже подтвердил — войти
            </Button>
          </div>
        ) : (
          <>
            <h1 className={styles.title}>
              {tab === 'sign-in' ? 'С возвращением' : 'Заведи Копилку'}
            </h1>
            <p className={styles.subtitle}>
              {tab === 'sign-in'
                ? 'Войди, чтобы данные синхронизировались между телефоном и компьютером.'
                : 'Аккаунт нужен, чтобы данные хранились в облаке и были на всех устройствах.'}
            </p>

            <SegmentedControl
              label="Вход или регистрация"
              options={[
                { value: 'sign-in', label: 'Вход' },
                { value: 'sign-up', label: 'Регистрация' },
              ]}
              value={tab}
              onChange={(value) => {
                setTab(value);
                setFormError(null);
              }}
            />

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
              <Field label="Пароль" error={errors.password?.message}>
                {(props) => (
                  <TextInput
                    type="password"
                    autoComplete={tab === 'sign-in' ? 'current-password' : 'new-password'}
                    placeholder="Минимум 6 символов"
                    {...props}
                    {...register('password')}
                  />
                )}
              </Field>
              <FormError>{formError}</FormError>
              <Button type="submit" size="lg" block loading={isSubmitting}>
                {tab === 'sign-in' ? 'Войти' : 'Зарегистрироваться'}
              </Button>
            </form>

            <div className={styles.divider}>
              <span>или</span>
            </div>
            <Button variant="ghost" block onClick={enterDemo}>
              Попробовать без регистрации
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
