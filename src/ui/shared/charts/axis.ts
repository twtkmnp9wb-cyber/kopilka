import { formatCompactNumber } from '@/domain';

/** Общий вид осей: приглушённые подписи, без линий осей — данные громче рамки. */
export const AXIS_TICK = { fill: 'var(--muted)', fontSize: 12 } as const;

export const formatAxisMoney = (value: number): string =>
  value === 0 ? '0' : formatCompactNumber(value);
