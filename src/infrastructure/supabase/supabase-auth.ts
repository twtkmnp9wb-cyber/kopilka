import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { AuthService, SignUpResult, UserSession } from '@/application';
import { AppError } from '@/application';
import { toAuthError, toLinkError, USER_EXISTS_MESSAGE } from './errors';

const toUserSession = (session: Session | null): UserSession | null =>
  session ? { userId: session.user.id, email: session.user.email ?? null, isDemo: false } : null;

export class SupabaseAuthService implements AuthService {
  private readonly recoveryListeners = new Set<() => void>();
  private recoveryPending = false;
  private linkError: AppError | null;

  constructor(
    private readonly client: SupabaseClient,
    /** Куда вернуть пользователя по ссылке из письма. */
    private readonly redirectTo: string,
    /** Фрагмент адреса при запуске: сюда Supabase кладёт токены или ошибку ссылки. */
    initialHash: string,
  ) {
    this.linkError = toLinkError(initialHash);
    // Подписка сразу: событие приходит один раз, пока клиент разбирает ссылку из письма,
    // и интерфейс к этому моменту может ещё не успеть подписаться.
    client.auth.onAuthStateChange((event) => {
      if (event !== 'PASSWORD_RECOVERY') return;
      if (this.recoveryListeners.size === 0) this.recoveryPending = true;
      for (const listener of this.recoveryListeners) listener();
    });
  }

  async currentSession(): Promise<UserSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw toAuthError(error);
    return toUserSession(data.session);
  }

  onSessionChange(listener: (session: UserSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(toUserSession(session));
    });
    return () => data.subscription.unsubscribe();
  }

  onPasswordRecovery(listener: () => void): () => void {
    this.recoveryListeners.add(listener);
    if (this.recoveryPending) {
      this.recoveryPending = false;
      listener();
    }
    return () => this.recoveryListeners.delete(listener);
  }

  takeLinkError(): AppError | null {
    const error = this.linkError;
    this.linkError = null;
    return error;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw toAuthError(error);
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: this.redirectTo },
    });
    if (error) throw toAuthError(error);
    // Supabase не раскрывает, что почта занята: вместо ошибки возвращает пользователя без identities.
    if (data.user && data.user.identities?.length === 0) {
      throw new AppError(USER_EXISTS_MESSAGE, 'user-exists');
    }
    return data.session ? { status: 'signed-in' } : { status: 'confirm-email' };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: this.redirectTo,
    });
    if (error) throw toAuthError(error, 'Не получилось отправить письмо — попробуй ещё раз');
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw toAuthError(error, 'Не получилось сохранить пароль — попробуй ещё раз');
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw toAuthError(error);
  }
}
