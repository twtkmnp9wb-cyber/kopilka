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
import { PasswordResetForm } from './PasswordResetForm';
import styles from './AuthPage.module.css';

type Tab = 'sign-in' | 'sign-up';

/** Письмо ушло: подтвердить почту после регистрации или войти по ссылке и сменить пароль. */
interface SentLetter {
  readonly email: string;
  readonly reason: 'confirm' | 'reset';
}

export default function AuthPage() {
  const { auth } = useContainer();
  const { enterDemo } = useMode();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'sign-up' ? 'sign-up' : 'sign-in');
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentLetter | null>(null);
  /** Почта для формы «Забыл пароль»; null — форма закрыта. */
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
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
        if (result.status === 'confirm-email') setSent({ email, reason: 'confirm' });
      }
    } catch (error) {
      if (error instanceof AppError && error.code === 'user-exists') setTab('sign-in');
      setFormError(error instanceof Error ? error.message : 'Не получилось — попробуй ещё раз');
    }
  });

  const backToSignIn = () => {
    setSent(null);
    setResetEmail(null);
    setFormError(null);
    setTab('sign-in');
  };

  return (
    <div className={styles.page}>
      <Link to="/welcome" className={styles.back}>
        <ArrowLeft size={18} aria-hidden /> На главную
      </Link>

      <div className={styles.card}>
        <div className={styles.logo} aria-hidden>
          <PiggyBank size={30} />
        </div>

        {sent ? (
          <div className={styles.sent}>
            <MailCheck size={36} aria-hidden className={styles.sentIcon} />
            <h1>Проверь почту</h1>
            {sent.reason === 'confirm' ? (
              <p>
                Мы отправили письмо на <b>{sent.email}</b>. Перейди по ссылке из него — и сразу
                попадёшь в Копилку.
              </p>
            ) : (
              <p>
                Если аккаунт с почтой <b>{sent.email}</b> есть, туда придёт ссылка. Открой её на
                любом устройстве — Копилка впустит тебя и попросит придумать новый пароль.
              </p>
            )}
            <p className={styles.sentNote}>Письмо может идти пару минут — загляни и в «Спам».</p>
            <Button variant="secondary" onClick={backToSignIn}>
              {sent.reason === 'confirm' ? 'Уже подтвердил — войти' : 'Вернуться ко входу'}
            </Button>
          </div>
        ) : resetEmail !== null ? (
          <PasswordResetForm
            defaultEmail={resetEmail}
            onSent={(email) => {
              setResetEmail(null);
              setSent({ email, reason: 'reset' });
            }}
            onBack={backToSignIn}
          />
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
              {tab === 'sign-in' && (
                <button
                  type="button"
                  className={styles.forgot}
                  onClick={() => {
                    setFormError(null);
                    setResetEmail(getValues('email').trim());
                  }}
                >
                  Забыл пароль?
                </button>
              )}
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
