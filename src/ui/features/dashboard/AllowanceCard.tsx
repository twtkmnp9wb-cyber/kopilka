import { CalendarClock, Plus, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { MonthOverview } from '@/application';
import { formatMonth, formatMoney, type AllowanceState } from '@/domain';
import { Button } from '@/ui/shared/components/Button';
import { Card } from '@/ui/shared/components/Card';
import { Money } from '@/ui/shared/components/Money';
import { ProgressBar, type ProgressTone } from '@/ui/shared/components/Progress';
import { cx } from '@/ui/shared/lib/cx';
import { useTransactionSheet } from '../transactions/TransactionSheetProvider';
import styles from './AllowanceCard.module.css';

const STATE_TONE: Record<AllowanceState, ProgressTone> = {
  ok: 'good',
  tight: 'warning',
  over: 'danger',
};

const STATE_LABEL: Record<AllowanceState, string> = {
  ok: 'В пределах плана',
  tight: 'Почти весь лимит на сегодня',
  over: 'Лимит на сегодня исчерпан',
};

const pluralDays = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
};

export function AllowanceCard({ overview }: { overview: MonthOverview }) {
  const sheet = useTransactionSheet();
  const navigate = useNavigate();
  const { plan, allowance } = overview;

  if (plan.income.expected === 0) {
    return (
      <Card className={styles.card}>
        <p className={styles.eyebrow}>Можно тратить сегодня</p>
        <h2 className={styles.setupTitle}>Расскажи о доходах — и Копилка посчитает бюджет</h2>
        <p className={styles.setupText}>
          Добавь регулярный доход (зарплату, стипендию) или просто внеси поступления этого месяца.
        </p>
        <div className={styles.setupActions}>
          <Button icon={<Repeat size={18} />} onClick={() => navigate('/settings')}>
            Регулярные доходы
          </Button>
          <Button
            variant="secondary"
            icon={<Plus size={18} />}
            onClick={() => sheet.open({ type: 'income' })}
          >
            Внести доход
          </Button>
        </div>
      </Card>
    );
  }

  if (!allowance) {
    const left = plan.free - plan.discretionarySpent;
    return (
      <Card className={styles.card}>
        <p className={styles.eyebrow}>Итог: {formatMonth(overview.month)}</p>
        <p className={cx(styles.hero, 'num', left < 0 && styles.over)}>
          <Money amount={left} />
        </p>
        <p className={styles.caption}>
          {left >= 0 ? 'осталось от свободного лимита' : 'сверх свободного лимита'} · лимит{' '}
          {formatMoney(Math.max(plan.free, 0))}
        </p>
      </Card>
    );
  }

  const tone = STATE_TONE[allowance.state];
  const shown = Math.max(allowance.leftToday, 0);
  return (
    <Card className={styles.card}>
      <p className={styles.eyebrow}>Можно тратить сегодня</p>
      <p className={cx(styles.hero, 'num', styles[allowance.state])}>
        <Money amount={shown} animated />
      </p>
      <div className={styles.meter}>
        <ProgressBar
          value={allowance.dailyLimit > 0 ? allowance.spentToday / allowance.dailyLimit : 1}
          tone={tone}
          label="Потрачено из дневного лимита"
        />
        <div className={styles.meterLegend}>
          <span>
            Потрачено сегодня <b className="num">{formatMoney(allowance.spentToday)}</b> из{' '}
            <span className="num">{formatMoney(allowance.dailyLimit)}</span>
          </span>
          <span className={styles.state}>{STATE_LABEL[allowance.state]}</span>
        </div>
      </div>
      <p className={styles.caption}>
        <CalendarClock size={15} aria-hidden /> {allowance.daysLeft}{' '}
        {pluralDays(allowance.daysLeft)} до конца месяца · свободно{' '}
        <b className="num">{formatMoney(Math.max(allowance.leftInMonth, 0))}</b>
      </p>
    </Card>
  );
}
