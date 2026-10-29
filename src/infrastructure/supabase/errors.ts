import { AppError } from '@/application';

interface ErrorLike {
  readonly message?: string;
  readonly code?: string;
  readonly status?: number;
}

const DB_MESSAGES: Record<string, string> = {
  '42P01': 'В базе нет таблиц Копилки — выполни supabase/setup.sql в SQL Editor',
  PGRST205: 'В базе нет таблиц Копилки — выполни supabase/setup.sql в SQL Editor',
  '42501': 'Нет доступа к данным — войди заново',
  PGRST301: 'Сессия истекла — войди заново',
  '23505': 'Такая запись уже есть',
  '23503': 'Связанная запись не найдена — обнови страницу',
  '23514': 'Данные не прошли проверку базы',
};

/** Ошибки PostgREST и сети → понятные пользователю сообщения. */
export function toAppError(error: unknown, fallback = 'Не удалось связаться с сервером'): AppError {
  if (error instanceof AppError) return error;
  const { message = '', code = '' } = (error ?? {}) as ErrorLike;
  if (/failed to fetch|network|load failed/i.test(message)) {
    return new AppError('Нет связи с сервером — проверь интернет', 'network', { cause: error });
  }
  const known = DB_MESSAGES[code];
  if (known) return new AppError(known, code, { cause: error });
  return new AppError(fallback, code || 'unknown', { cause: error });
}

const AUTH_MESSAGES: ReadonlyArray<[RegExp, string, string]> = [
  [/invalid login credentials/i, 'Неверная почта или пароль', 'invalid-credentials'],
  [
    /email not confirmed/i,
    'Почта ещё не подтверждена — открой письмо и перейди по ссылке',
    'email-not-confirmed',
  ],
  [
    /already registered|already exists/i,
    'Эта почта уже зарегистрирована — просто войди',
    'user-exists',
  ],
  [
    /rate limit|too many/i,
    'Слишком много попыток — подожди немного и попробуй снова',
    'rate-limit',
  ],
  [
    /password should be|weak password/i,
    'Пароль слишком простой — минимум 6 символов',
    'weak-password',
  ],
  [/signups not allowed|signup is disabled/i, 'Регистрация сейчас закрыта', 'signup-disabled'],
];

export function toAuthError(error: unknown): AppError {
  const { message = '' } = (error ?? {}) as ErrorLike;
  for (const [pattern, text, code] of AUTH_MESSAGES) {
    if (pattern.test(message)) return new AppError(text, code, { cause: error });
  }
  return toAppError(error, 'Не получилось войти — попробуй ещё раз');
}
