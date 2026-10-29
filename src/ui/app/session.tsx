import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UserSession } from '@/application';
import { useContainer } from '@/ui/shared/container';
import { Splash } from './Splash';

type SessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly session: UserSession | null };

const SessionContext = createContext<UserSession | null>(null);

/**
 * Держит текущую сессию и не пускает дальше, пока она не определена: так ссылка
 * подтверждения из письма (токен в URL) успевает обработаться до старта роутера.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useContainer();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let currentUser: string | null | undefined;
    const apply = (session: UserSession | null) => {
      if (cancelled) return;
      const userId = session?.userId ?? null;
      // Сменился пользователь — кэш предыдущего не должен мелькнуть ни на миг.
      if (currentUser !== undefined && currentUser !== userId) queryClient.clear();
      currentUser = userId;
      setState({ status: 'ready', session });
    };
    auth
      .currentSession()
      .then(apply)
      .catch(() => apply(null));
    const unsubscribe = auth.onSessionChange(apply);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [auth, queryClient]);

  if (state.status === 'loading') return <Splash />;
  return <SessionContext value={state.session}>{children}</SessionContext>;
}

export const useSession = (): UserSession | null => use(SessionContext);
