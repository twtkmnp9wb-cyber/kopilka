import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonth } from '@/domain';
import { IconButton } from '@/ui/shared/components/Button';
import { usePeriod } from '@/ui/shared/period';
import styles from './MonthSwitcher.module.css';

export function MonthSwitcher() {
  const { month, currentMonth, shift, setMonth } = usePeriod();
  return (
    <div className={styles.switcher}>
      <IconButton label="Предыдущий месяц" onClick={() => shift(-1)}>
        <ChevronLeft size={20} />
      </IconButton>
      <button
        type="button"
        className={styles.label}
        onClick={() => setMonth(currentMonth)}
        title="Вернуться к текущему месяцу"
        aria-live="polite"
      >
        {formatMonth(month)}
      </button>
      <IconButton label="Следующий месяц" onClick={() => shift(1)} disabled={month >= currentMonth}>
        <ChevronRight size={20} />
      </IconButton>
    </div>
  );
}
