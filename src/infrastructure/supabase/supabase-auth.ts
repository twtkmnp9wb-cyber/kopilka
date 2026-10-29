import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { AuthService, SignUpResult, UserSession } from '@/application';
import { AppError } from '@/application';
import { toAuthError } from './errors';

const toUserSession = (session: Session | null): UserSession | null =>
  session ? { userId: session.user.id, email: session.user.email ?? null, isDemo: false } : null;

export class SupabaseAuthService implements AuthService {
  constructor(
    private readonly client: SupabaseClient,
    /** Куда вернуть пользователя по ссылке из письма. */
    private readonly redirectTo: string,
  ) {}

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
      throw new AppError('Эта почта уже зарегистрирована — просто войди', 'user-exists');
    }
    return data.session ? { status: 'signed-in' } : { status: 'confirm-email' };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw toAuthError(error);
  }
}
