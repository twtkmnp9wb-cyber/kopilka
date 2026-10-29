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

export const USER_EXISTS_MESSAGE = 'Эта почта уже зарегистрирована — войди или восстанови пароль';

// Проверяются по порядку против «код + текст» ошибки Supabase: частные случаи — выше общих.
const AUTH_MESSAGES: ReadonlyArray<[RegExp, string, string]> = [
  [/invalid login credentials/i, 'Неверная почта или пароль', 'invalid-credentials'],
  [
    /email not confirmed/i,
    'Почта ещё не подтверждена — открой письмо и перейди по ссылке',
    'email-not-confirmed',
  ],
  [
    /already (been )?registered|already exists|user_already_exists|email_exists/i,
    USER_EXISTS_MESSAGE,
    'user-exists',
  ],
  [
    /same_password|should be different/i,
    'Это твой текущий пароль — придумай другой',
    'same-password',
  ],
  // Повторный запрос письма раньше минуты: код тот же, что у часового лимита, отличает текст.
  [
    /for security purposes/i,
    'Письмо уже отправлено — новое можно запросить через минуту',
    'email-cooldown',
  ],
  [
    /email rate limit|over_email_send_rate_limit/i,
    'Письма на этот час закончились — попробуй позже',
    'email-rate-limit',
  ],
  [
    /rate[ _]limit|too many/i,
    'Слишком много попыток — подожди немного и попробуй снова',
    'rate-limit',
  ],
  [
    /password should be|weak password/i,
    'Пароль слишком простой — минимум 6 символов',
    'weak-password',
  ],
  [/reauthenticat/i, 'Для смены пароля войди заново', 'reauthentication-needed'],
  [/session missing|session_not_found/i, 'Сессия истекла — войди заново', 'session-missing'],
  [/signups not allowed|signup is disabled/i, 'Регистрация сейчас закрыта', 'signup-disabled'],
];

export function toAuthError(
  error: unknown,
  fallback = 'Не получилось войти — попробуй ещё раз',
): AppError {
  const { message = '', code = '' } = (error ?? {}) as ErrorLike;
  const text = `${code} ${message}`;
  for (const [pattern, userMessage, appCode] of AUTH_MESSAGES) {
    if (pattern.test(text)) return new AppError(userMessage, appCode, { cause: error });
  }
  return toAppError(error, fallback);
}

/**
 * Ошибка ссылки из письма. Supabase кладёт её во фрагмент адреса (#error_code=otp_expired&…),
 * обычный маршрут вида #/settings ошибкой не считается.
 */
export function toLinkError(hash: string): AppError | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const code = params.get('error_code') ?? params.get('error');
  if (!code) return null;
  return code === 'otp_expired'
    ? new AppError('Ссылка из письма устарела или уже использована — запроси новую', 'link-expired')
    : new AppError('Не получилось войти по ссылке из письма — попробуй ещё раз', 'link-failed');
}
