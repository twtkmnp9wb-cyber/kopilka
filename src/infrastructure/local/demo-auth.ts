import { AppError, type AuthService, type UserSession } from '@/application';

const DEMO_SESSION: UserSession = { userId: 'demo', email: null, isDemo: true };

/** В демо пользователь «вошёл» всегда; выход означает выход из демо-режима. */
export class DemoAuthService implements AuthService {
  private readonly listeners = new Set<(session: UserSession | null) => void>();
  private session: UserSession | null = DEMO_SESSION;

  constructor(private readonly onExit: () => void) {}

  async currentSession(): Promise<UserSession | null> {
    return this.session;
  }

  onSessionChange(listener: (session: UserSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async signIn(): Promise<void> {
    throw new AppError('В демо-режиме вход не нужен', 'demo');
  }

  async signUp(): Promise<never> {
    throw new AppError('В демо-режиме регистрация не нужна', 'demo');
  }

  async signOut(): Promise<void> {
    this.session = null;
    this.onExit();
    for (const listener of this.listeners) listener(null);
  }
}
