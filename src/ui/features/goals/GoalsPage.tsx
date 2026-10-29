import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { buildPlan } from '@/application';
import {
  Ledger,
  formatDay,
  formatMoney,
  planGoal,
  type Goal,
  type GoalProgress,
  type GoalStatus,
} from '@/domain';
import { Button, IconButton } from '@/ui/shared/components/Button';
import { ProgressRing } from '@/ui/shared/components/Progress';
import { Sheet } from '@/ui/shared/components/Sheet';
import { EmptyState, ErrorState, PageSkeleton } from '@/ui/shared/components/States';
import { queryKeys, useFinanceMutation, useSnapshot } from '@/ui/shared/data/queries';
import { cx } from '@/ui/shared/lib/cx';
import { usePeriod } from '@/ui/shared/period';
import { useTransactionSheet } from '../transactions/TransactionSheetProvider';
import { GoalForm } from './GoalForm';
import styles from './GoalsPage.module.css';

const STATUS: Record<GoalStatus, { label: string; className: string }> = {
  reached: { label: 'Накоплено', className: styles.reached ?? '' },
  'on-track': { label: 'По плану', className: styles.onTrack ?? '' },
  behind: { label: 'Отстаёшь', className: styles.behind ?? '' },
  overdue: { label: 'Срок прошёл', className: styles.overdue ?? '' },
};

function GoalCard({
  progress,
  today,
  onContribute,
  onEdit,
  onArchive,
}: {
  progress: GoalProgress;
  today: string;
  onContribute: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { goal } = progress;
  const status = STATUS[progress.status];
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <ProgressRing
          value={progress.ratio}
          size={76}
          stroke={7}
          label={`Накоплено ${Math.round(progress.ratio * 100)}%`}
        >
          <span aria-hidden>{goal.emoji}</span>
        </ProgressRing>
        <div className={styles.titleBlock}>
          <h2 className={styles.name}>{goal.name}</h2>
          <p className={styles.deadline}>до {formatDay(goal.deadline, today)}</p>
          <span className={cx(styles.badge, status.className)}>
            {status.label}
            {progress.status === 'behind' && ` на ${formatMoney(progress.behindBy)}`}
          </span>
        </div>
        <div className={styles.menu}>
          <IconButton label="Изменить цель" onClick={onEdit}>
            <Pencil size={18} />
          </IconButton>
          <IconButton label="В архив" onClick={onArchive}>
            <Archive size={18} />
          </IconButton>
        </div>
      </div>

      <p className={styles.amounts}>
        <b className="num">{formatMoney(progress.saved)}</b>
        <span className="num"> из {formatMoney(goal.target)}</span>
        <span className={cx(styles.percent, 'num')}>{Math.round(progress.ratio * 100)}%</span>
      </p>

      <div className={styles.footer}>
        <div>
          <p className={styles.footLabel}>
            {progress.status === 'reached' ? 'Цель достигнута' : 'Рекомендуемый взнос'}
          </p>
          {progress.status !== 'reached' && (
            <p className={styles.footValue}>
              <span className="num">{formatMoney(progress.monthlyRequired)}</span>
              <span className={styles.perMonth}> / мес</span>
              {progress.dueThisMonth > 0 && progress.dueThisMonth < progress.monthlyRequired && (
                <span className={styles.perMonth}>
                  {' '}
                  · осталось {formatMoney(progress.dueThisMonth)}
                </span>
              )}
            </p>
          )}
        </div>
        {progress.status !== 'reached' && (
          <Button size="sm" onClick={onContribute}>
            Внести
          </Button>
        )}
      </div>
    </article>
  );
}

export default function GoalsPage() {
  const { snapshot, isPending, error, retry } = useSnapshot();
  const { today, currentMonth } = usePeriod();
  const sheet = useTransactionSheet();
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  const setArchived = useFinanceMutation(
    (useCases, { id, archived }: { id: string; archived: boolean }) =>
      useCases.goals.setArchived(id, archived),
    [queryKeys.goals],
  );
  const removeGoal = useFinanceMutation(
    (useCases, id: string) => useCases.goals.remove(id),
    [queryKeys.goals, queryKeys.transactions],
  );

  const plan = useMemo(
    () => (snapshot ? buildPlan(snapshot, currentMonth) : null),
    [snapshot, currentMonth],
  );
  const archived = useMemo(() => {
    if (!snapshot) return [];
    const ledger = new Ledger(snapshot.transactions);
    return snapshot.goals.filter((g) => g.archived).map((g) => planGoal(g, ledger, currentMonth));
  }, [snapshot, currentMonth]);

  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (isPending || !plan) return <PageSkeleton />;

  return (
    <div className={styles.page}>
      <div className={styles.summary}>
        <p>
          {plan.goals.length > 0 ? (
            <>
              В этом месяце на цели по плану —{' '}
              <b className="num">{formatMoney(plan.goalsAllocation)}</b>
            </>
          ) : (
            'Цели помогают копить: Копилка разложит сумму на ежемесячные взносы.'
          )}
        </p>
        <Button icon={<Plus size={18} />} onClick={() => setEditing('new')}>
          Новая цель
        </Button>
      </div>

      {plan.goals.length === 0 ? (
        <EmptyState
          illustration={<Target size={30} />}
          title="Создай первую цель"
          text="Ноутбук, поездка, подушка безопасности — укажи сумму и срок, а Копилка посчитает взнос в месяц и подскажет, успеваешь ли ты."
          action={<Button onClick={() => setEditing('new')}>Создать цель</Button>}
        />
      ) : (
        <div className={styles.grid}>
          {plan.goals.map((progress) => (
            <GoalCard
              key={progress.goal.id}
              progress={progress}
              today={today}
              onContribute={() => sheet.open({ type: 'saving', goalId: progress.goal.id })}
              onEdit={() => setEditing(progress.goal)}
              onArchive={() => setArchived.mutate({ id: progress.goal.id, archived: true })}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <section className={styles.archive}>
          <button
            type="button"
            className={styles.archiveToggle}
            onClick={() => setShowArchive((v) => !v)}
          >
            Архив ({archived.length}) {showArchive ? '▴' : '▾'}
          </button>
          {showArchive && (
            <ul className={styles.archiveList}>
              {archived.map(({ goal, saved }) => (
                <li key={goal.id} className={styles.archiveRow}>
                  <span aria-hidden>{goal.emoji}</span>
                  <span className={styles.archiveName}>{goal.name}</span>
                  <span className="num">{formatMoney(saved)}</span>
                  <IconButton
                    label="Вернуть из архива"
                    onClick={() => setArchived.mutate({ id: goal.id, archived: false })}
                  >
                    <ArchiveRestore size={18} />
                  </IconButton>
                  <IconButton
                    label="Удалить навсегда"
                    onClick={() => {
                      const message =
                        saved > 0
                          ? `Удалить «${goal.name}»? Отложенные ${formatMoney(saved)} вернутся в свободные деньги.`
                          : `Удалить «${goal.name}»?`;
                      if (window.confirm(message)) removeGoal.mutate(goal.id);
                    }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Новая цель' : 'Цель'}
      >
        {editing !== null && (
          <GoalForm
            goal={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
