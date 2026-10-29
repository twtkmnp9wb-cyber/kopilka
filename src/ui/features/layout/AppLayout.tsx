import { Suspense } from 'react';
import {
  ArrowLeftRight,
  ChartLine,
  LayoutDashboard,
  PiggyBank,
  Plus,
  Settings,
  Target,
  WifiOff,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useMode } from '@/ui/app/mode';
import { PageSkeleton } from '@/ui/shared/components/States';
import { cx } from '@/ui/shared/lib/cx';
import { useOnline } from '@/ui/shared/lib/hooks';
import { PeriodProvider } from '@/ui/shared/period';
import {
  TransactionSheetProvider,
  useTransactionSheet,
} from '../transactions/TransactionSheetProvider';
import { MonthSwitcher } from './MonthSwitcher';
import styles from './AppLayout.module.css';

const NAV = [
  { to: '/', label: 'Главная', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Операции', icon: ArrowLeftRight, end: false },
  { to: '/goals', label: 'Цели', icon: Target, end: false },
  { to: '/plan', label: 'План', icon: ChartLine, end: false },
] as const;

const TITLES: Record<string, string> = {
  '/': 'Главная',
  '/transactions': 'Операции',
  '/goals': 'Цели',
  '/plan': 'План',
  '/settings': 'Настройки',
};

/** Экраны, где важен выбранный месяц. */
const MONTH_AWARE = new Set(['/', '/transactions', '/plan']);

function AddButton({ className }: { className?: string }) {
  const sheet = useTransactionSheet();
  return (
    <button
      type="button"
      className={className}
      onClick={() => sheet.open()}
      aria-label="Добавить операцию"
    >
      <Plus size={26} strokeWidth={2.4} aria-hidden />
    </button>
  );
}

function NavItem({ to, label, icon: Icon, end }: (typeof NAV)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cx(styles.navItem, isActive && styles.active)}
    >
      <Icon size={22} aria-hidden />
      <span>{label}</span>
    </NavLink>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const online = useOnline();
  const { mode, exitDemo } = useMode();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <PiggyBank size={26} aria-hidden />
          <span>Копилка</span>
        </div>
        <AddButton className={styles.sidebarAdd} />
        <nav aria-label="Разделы" className={styles.sideNav}>
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) => cx(styles.navItem, isActive && styles.active)}
          >
            <Settings size={22} aria-hidden />
            <span>Настройки</span>
          </NavLink>
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>{TITLES[pathname] ?? 'Копилка'}</h1>
          <div className={styles.headerActions}>
            {MONTH_AWARE.has(pathname) && <MonthSwitcher />}
            <NavLink
              to="/settings"
              className={styles.settingsLink}
              aria-label="Настройки"
              title="Настройки"
            >
              <Settings size={20} aria-hidden />
            </NavLink>
          </div>
        </header>

        {mode === 'demo' && (
          <div className={styles.banner}>
            <span>Демо-режим: данные примерные и хранятся только в этом браузере.</span>
            <button type="button" onClick={() => void exitDemo()}>
              Выйти из демо
            </button>
          </div>
        )}
        {!online && (
          <div className={cx(styles.banner, styles.offline)} role="status">
            <WifiOff size={16} aria-hidden />
            <span>Нет сети — изменения не сохранятся, пока связь не вернётся.</span>
          </div>
        )}

        <main className={styles.content}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav aria-label="Разделы" className={styles.tabbar}>
        <NavItem {...NAV[0]} />
        <NavItem {...NAV[1]} />
        <div className={styles.fabSlot}>
          <AddButton className={styles.fab} />
        </div>
        <NavItem {...NAV[2]} />
        <NavItem {...NAV[3]} />
      </nav>
    </div>
  );
}

export default function AppLayout() {
  return (
    <PeriodProvider>
      <TransactionSheetProvider>
        <Shell />
      </TransactionSheetProvider>
    </PeriodProvider>
  );
}
