import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { AppContainer, AppMode } from '@/application';
import { createCloudContainer, createDemoContainer } from '@/infrastructure/container';
import { ContainerContext } from '@/ui/shared/container';
import { readPreference, writePreference } from '@/ui/shared/lib/preferences';

interface ModeContextValue {
  readonly mode: AppMode;
  enterDemo(): void;
  /** Выйти из демо: демо-данные стираются, приложение возвращается к облачному входу. */
  exitDemo(): Promise<void>;
}

const ModeContext = createContext<ModeContextValue | null>(null);

/**
 * Composition root интерфейса: по режиму выбирает контейнер (Supabase или демо в localStorage).
 * Всё, что ниже, работает только с портами и не знает, где лежат данные.
 */
export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(() =>
    readPreference('mode') === 'demo' ? 'demo' : 'cloud',
  );

  const switchMode = useCallback((next: AppMode) => {
    writePreference('mode', next === 'demo' ? 'demo' : null);
    setMode(next);
  }, []);

  const container = useMemo<AppContainer>(
    () =>
      mode === 'demo' ? createDemoContainer(() => switchMode('cloud')) : createCloudContainer(),
    [mode, switchMode],
  );

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      enterDemo: () => switchMode('demo'),
      exitDemo: () => container.auth.signOut(),
    }),
    [mode, switchMode, container],
  );

  return (
    <ModeContext value={value}>
      <ContainerContext value={container}>{children}</ContainerContext>
    </ModeContext>
  );
}

export function useMode(): ModeContextValue {
  const context = use(ModeContext);
  if (!context) throw new Error('useMode вне ModeProvider');
  return context;
}
