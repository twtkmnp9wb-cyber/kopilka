import { describe, expect, it } from 'vitest';
import { toAuthError, toLinkError } from './errors';

describe('toAuthError', () => {
  it.each([
    [{ code: 'invalid_credentials', message: 'Invalid login credentials' }, 'invalid-credentials'],
    [{ code: 'user_already_exists', message: 'User already registered' }, 'user-exists'],
    [
      { code: 'same_password', message: 'New password should be different from the old password.' },
      'same-password',
    ],
    [
      { code: 'weak_password', message: 'Password should be at least 6 characters.' },
      'weak-password',
    ],
    [
      {
        code: 'over_email_send_rate_limit',
        message: 'For security purposes, you can only request this after 37 seconds.',
      },
      'email-cooldown',
    ],
    [
      { code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' },
      'email-rate-limit',
    ],
    [{ code: 'over_request_rate_limit', message: 'Request rate limit reached' }, 'rate-limit'],
    [{ message: 'Auth session missing!' }, 'session-missing'],
  ])('узнаёт ошибку Supabase %#', (error, code) => {
    expect(toAuthError(error).code).toBe(code);
  });

  it('незнакомую ошибку показывает переданным текстом', () => {
    const error = toAuthError({ message: 'boom' }, 'Не получилось сохранить пароль');
    expect(error.message).toBe('Не получилось сохранить пароль');
  });
});

describe('toLinkError', () => {
  it('обычный маршрут ошибкой не считает', () => {
    expect(toLinkError('')).toBeNull();
    expect(toLinkError('#/settings')).toBeNull();
    expect(toLinkError('#/auth?tab=sign-up')).toBeNull();
  });

  it('узнаёт устаревшую ссылку из письма', () => {
    const hash =
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    expect(toLinkError(hash)?.code).toBe('link-expired');
  });

  it('прочие ошибки ссылки тоже сообщает', () => {
    expect(toLinkError('#error=server_error&error_description=boom')?.code).toBe('link-failed');
  });
});
