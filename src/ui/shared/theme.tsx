import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { readPreference, writePreference } from './lib/preferences';

export type ThemeChoice = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  readonly theme: ThemeChoice;
  setTheme(theme: ThemeChoice): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isThemeChoice = (value: string | null): value is ThemeChoice =>
  value === 'dark' || value === 'light' || value === 'system';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(() => {
    const stored = readPreference('theme');
    return isThemeChoice(stored) ? stored : 'dark';
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    writePreference('theme', next);
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme вне ThemeProvider');
  return context;
}
