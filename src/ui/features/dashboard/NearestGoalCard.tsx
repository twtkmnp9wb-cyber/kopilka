import { Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { formatDay, formatMoney, type GoalProgress } from '@/domain';
import { Button } from '@/ui/shared/components/Button';
import { Card } from '@/ui/shared/components/Card';
import { ProgressRing } from '@/ui/shared/components/Progress';
import { EmptyState } from '@/ui/shared/components/States';
import { usePeriod } from '@/ui/shared/period';
import { useTransactionSheet } from '../transactions/TransactionSheetProvider';
import styles from './NearestGoalCard.module.css';

export function NearestGoalCard({ progress }: { progress: GoalProgress | null }) {
  const sheet = useTransactionSheet();
  const navigate = useNavigate();
  const { today } = usePeriod();

  if (!progress) {
    return (
      <Card title="Ближайшая цель">
        <EmptyState
          compact
          illustration={<Target size={30} />}
          title="Целей пока нет"
          text="Поставь цель с дедлайном — Копилка посчитает, сколько откладывать в месяц."
          action={
            <Button variant="secondary" onClick={() => navigate('/goals')}>
              Создать цель
            </Button>
          }
        />
      </Card>
    );
  }

  const { goal } = progress;
  return (
    <Card
      title="Ближайшая цель"
      action={
        <Link to="/goals" className={styles.all}>
          Все цели
        </Link>
      }
    >
      <div className={styles.body}>
        <ProgressRing
          value={progress.ratio}
          size={84}
          stroke={8}
          label={`Накоплено ${Math.round(progress.ratio * 100)}%`}
        >
          <span aria-hidden>{goal.emoji}</span>
        </ProgressRing>
        <div className={styles.info}>
          <p className={styles.name}>{goal.name}</p>
          <p className={styles.sum}>
            <b className="num">{formatMoney(progress.saved)}</b> из{' '}
            <span className="num">{formatMoney(goal.target)}</span>
          </p>
          <p className={styles.deadline}>до {formatDay(goal.deadline, today)}</p>
        </div>
      </div>
      <div className={styles.footer}>
        <p className={styles.due}>
          {progress.dueThisMonth > 0 ? (
            <>
              В этом месяце внеси ещё <b className="num">{formatMoney(progress.dueThisMonth)}</b>
            </>
          ) : (
            'Взнос этого месяца уже сделан 🎉'
          )}
        </p>
        <Button size="sm" onClick={() => sheet.open({ type: 'saving', goalId: goal.id })}>
          Внести
        </Button>
      </div>
    </Card>
  );
}
