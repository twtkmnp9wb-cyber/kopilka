import { formatMoney, type Kopecks } from '@/domain';
import { useAnimatedNumber } from '../lib/hooks';

interface MoneyProps {
  readonly amount: Kopecks;
  readonly signed?: boolean;
  readonly animated?: boolean;
  readonly className?: string;
}

/** Сумма в рублях; с `animated` плавно докручивается при изменении. */
export function Money({ amount, signed, animated, className }: MoneyProps) {
  const shown = useAnimatedNumber(amount);
  // Во время анимации — целые рубли, в конце — точная сумма.
  const value = animated && shown !== amount ? Math.round(shown / 100) * 100 : amount;
  return (
    <span className={className} aria-label={animated ? formatMoney(amount, { signed }) : undefined}>
      {formatMoney(value, { signed })}
    </span>
  );
}
