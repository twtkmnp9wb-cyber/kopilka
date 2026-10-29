import { useRef, useState, type PointerEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { formatMoney, type Category, type Goal, type Transaction } from '@/domain';
import { CategoryBadge } from '@/ui/shared/category-visuals';
import { cx } from '@/ui/shared/lib/cx';
import styles from './TransactionRow.module.css';

interface TransactionRowProps {
  readonly transaction: Transaction;
  readonly category: Category | undefined;
  readonly goal: Goal | undefined;
  readonly onOpen: () => void;
  readonly onDelete: () => void;
}

/** Ширина кнопки «Удалить», которую открывает свайп влево. */
const REVEAL = 88;

function describe({
  transaction,
  category,
  goal,
}: Pick<TransactionRowProps, 'transaction' | 'category' | 'goal'>) {
  if (transaction.type === 'saving') {
    return {
      title: goal ? `${goal.emoji} ${goal.name}` : 'Цель',
      subtitle: transaction.amount < 0 ? 'Забрано из цели' : 'Отложено в цель',
    };
  }
  return { title: category?.name ?? 'Без категории', subtitle: null };
}

export function TransactionRow({
  transaction,
  category,
  goal,
  onOpen,
  onDelete,
}: TransactionRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(
    null,
  );
  const moved = useRef(false);

  const { title, subtitle } = describe({ transaction, category, goal });
  const note = transaction.note || subtitle;
  const amountText =
    transaction.type === 'income'
      ? formatMoney(transaction.amount, { signed: true })
      : transaction.type === 'expense'
        ? `−${formatMoney(transaction.amount)}`
        : formatMoney(Math.abs(transaction.amount));

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    gesture.current = { x: event.clientX, y: event.clientY, base: offset, horizontal: null };
    moved.current = false;
  };

  const onPointerMove = (event: PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (g.horizontal === null && Math.hypot(dx, dy) > 8) g.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!g.horizontal) return;
    moved.current = true;
    setDragging(true);
    setOffset(Math.min(0, Math.max(-REVEAL * 1.4, g.base + dx)));
  };

  const onPointerEnd = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setDragging(false);
    setOffset((current) => (current < -REVEAL / 2 ? -REVEAL : 0));
  };

  return (
    <li className={styles.item}>
      <button
        type="button"
        className={styles.delete}
        onClick={onDelete}
        tabIndex={offset === 0 ? -1 : 0}
        aria-hidden={offset === 0}
      >
        <Trash2 size={20} aria-hidden />
        Удалить
      </button>
      <button
        type="button"
        className={cx(styles.row, dragging && styles.dragging)}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClick={() => {
          if (moved.current) return;
          if (offset !== 0) setOffset(0);
          else onOpen();
        }}
      >
        {transaction.type === 'saving' ? (
          <span className={styles.goalBadge} aria-hidden>
            {goal?.emoji ?? '🎯'}
          </span>
        ) : (
          <CategoryBadge icon={category?.icon ?? 'more'} color={category?.color ?? 'neutral'} />
        )}
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          {note && <span className={styles.note}>{note}</span>}
        </span>
        <span
          className={cx(
            styles.amount,
            'num',
            transaction.type === 'income' && styles.income,
            transaction.type === 'saving' && styles.saving,
          )}
        >
          {amountText}
        </span>
      </button>
    </li>
  );
}
