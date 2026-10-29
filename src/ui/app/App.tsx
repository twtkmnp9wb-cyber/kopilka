import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { AppError } from '@/application';
import { useContainer } from '@/ui/shared/container';
import { ThemeProvider } from '@/ui/shared/theme';
import { ToastProvider } from '@/ui/shared/toast/ToastProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { ModeProvider } from './mode';
import { SessionProvider, useSession } from './session';
import { Splash } from './Splash';

const LandingPage = lazy(() => import('@/ui/features/landing/LandingPage'));
const AuthPage = lazy(() => import('@/ui/features/auth/AuthPage'));
const AppLayout = lazy(() => import('@/ui/features/layout/AppLayout'));
const DashboardPage = lazy(() => import('@/ui/features/dashboard/DashboardPage'));
const TransactionsPage = lazy(() => import('@/ui/features/transactions/TransactionsPage'));
const GoalsPage = lazy(() => import('@/ui/features/goals/GoalsPage'));
const PlanPage = lazy(() => import('@/ui/features/plan/PlanPage'));
const SettingsPage = lazy(() => import('@/ui/features/settings/SettingsPage'));

function RequireSession() {
  return useSession() ? <Outlet /> : <Navigate to="/welcome" replace />;
}

function PublicOnly() {
  return useSession() ? <Navigate to="/" replace /> : <Outlet />;
}

function AppRoutes() {
  return (
    <HashRouter>
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
          </Route>
          <Route element={<RequireSession />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="plan" element={<PlanPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

/** Свой QueryClient на каждый контейнер: данные демо и облака никогда не смешиваются. */
function DataProvider({ children }: { children: ReactNode }) {
  const container = useContainer();
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: container.mode === 'cloud',
            retry: (failureCount, error) =>
              !(error instanceof AppError && error.code !== 'network') && failureCount < 2,
          },
        },
      }),
    [container],
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ModeProvider>
            <DataProvider>
              <SessionProvider>
                <AppRoutes />
              </SessionProvider>
            </DataProvider>
          </ModeProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
