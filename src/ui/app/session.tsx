import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UserSession } from '@/application';
import { useContainer } from '@/ui/shared/container';
import { useToast } from '@/ui/shared/toast/ToastProvider';
import { Splash } from './Splash';

type SessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly session: UserSession | null };

interface PasswordRecovery {
  /** Вход по ссылке «восстановить пароль», новый пароль ещё не задан. */
  readonly pending: boolean;
  finish(): void;
}

const SessionContext = createContext<UserSession | null>(null);
const PasswordRecoveryContext = createContext<PasswordRecovery>({
  pending: false,
  finish: () => undefined,
});

/**
 * Держит текущую сессию и не пускает дальше, пока она не определена: так ссылка
 * подтверждения из письма (токен в URL) успевает обработаться до старта роутера.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useContainer();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [recovering, setRecovering] = useState(false);

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
    const unsubscribeRecovery = auth.onPasswordRecovery(() => {
      if (!cancelled) setRecovering(true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeRecovery();
    };
  }, [auth, queryClient]);

  // Ссылка из письма не сработала — сказать об этом, а не молча открыть главную.
  useEffect(() => {
    const linkError = auth.takeLinkError();
    if (linkError) toast.show({ message: linkError.message, tone: 'error', durationMs: 8000 });
  }, [auth, toast]);

  const finishRecovery = useCallback(() => setRecovering(false), []);
  const recovery = useMemo(
    () => ({ pending: recovering, finish: finishRecovery }),
    [recovering, finishRecovery],
  );

  if (state.status === 'loading') return <Splash />;
  return (
    <SessionContext value={state.session}>
      <PasswordRecoveryContext value={recovery}>{children}</PasswordRecoveryContext>
    </SessionContext>
  );
}

export const useSession = (): UserSession | null => use(SessionContext);

export const usePasswordRecovery = (): PasswordRecovery => use(PasswordRecoveryContext);
