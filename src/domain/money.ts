/**
 * Денежная сумма в копейках. Всегда целое число: так сложение и деление
 * не накапливают ошибок плавающей точки, а округление происходит явно.
 */
export type Kopecks = number;

export const KOPECKS_PER_RUBLE = 100;

export const rubles = (value: number): Kopecks => Math.round(value * KOPECKS_PER_RUBLE);

export const toRubles = (amount: Kopecks): number => amount / KOPECKS_PER_RUBLE;

export function sumOf(amounts: Iterable<Kopecks>): Kopecks {
  let total = 0;
  for (const amount of amounts) total += amount;
  return total;
}

/** Округляет вверх до целых рублей — для взносов, чтобы «чуть-чуть» не оставалось на последний месяц. */
export const ceilToRuble = (amount: Kopecks): Kopecks =>
  Math.ceil(amount / KOPECKS_PER_RUBLE) * KOPECKS_PER_RUBLE;

export const floorToRuble = (amount: Kopecks): Kopecks =>
  Math.floor(amount / KOPECKS_PER_RUBLE) * KOPECKS_PER_RUBLE;

/**
 * Делит сумму пропорционально весам методом наибольших остатков:
 * части целые (в рублях), а их сумма в точности равна исходной.
 * Если все веса нулевые, делит поровну. Неположительная сумма даёт нули.
 */
export function splitProportionally(total: Kopecks, weights: readonly number[]): Kopecks[] {
  if (weights.length === 0) return [];
  if (total <= 0) return weights.map(() => 0);
  const units = Math.floor(total / KOPECKS_PER_RUBLE);
  const positive = weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 0));
  const weightSum = positive.reduce((acc, weight) => acc + weight, 0);
  const normalized =
    weightSum > 0 ? positive.map((w) => w / weightSum) : positive.map(() => 1 / positive.length);

  const raw = normalized.map((share) => share * units);
  const parts = raw.map(Math.floor);
  let remainder = units - parts.reduce((acc, part) => acc + part, 0);

  const byFraction = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of byFraction) {
    if (remainder <= 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    remainder -= 1;
  }

  const leftover = total - units * KOPECKS_PER_RUBLE;
  return parts.map((part, index) => part * KOPECKS_PER_RUBLE + (index === 0 ? leftover : 0));
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(fractionDigits: number, compact: boolean): Intl.NumberFormat {
  const key = `${fractionDigits}:${compact}`;
  let instance = formatters.get(key);
  if (!instance) {
    instance = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: compact ? 0 : fractionDigits,
      maximumFractionDigits: compact ? 1 : fractionDigits,
      ...(compact ? { notation: 'compact', compactDisplay: 'short' } : {}),
    });
    formatters.set(key, instance);
  }
  return instance;
}

export interface FormatMoneyOptions {
  /** Показывать «+» у положительных сумм. */
  readonly signed?: boolean;
  /** Сокращённая запись: «12,3 тыс. ₽». */
  readonly compact?: boolean;
}

/** «12 345 ₽», копейки — только когда они есть: «12 345,50 ₽». */
export function formatMoney(amount: Kopecks, options: FormatMoneyOptions = {}): string {
  const hasKopecks = amount % KOPECKS_PER_RUBLE !== 0;
  const text = formatter(hasKopecks ? 2 : 0, options.compact ?? false).format(toRubles(amount));
  return options.signed && amount > 0 ? `+${text}` : text;
}

/** Число без знака валюты для осей графиков: «12 тыс.», «1,2 млн». */
export function formatCompactNumber(amount: Kopecks): string {
  return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(
    toRubles(amount),
  );
}

/**
 * Разбирает ввод пользователя: «1 234,5», «1234.50», «1 234 ₽».
 * Возвращает null для пустой или некорректной строки.
 */
export function parseMoney(input: string): Kopecks | null {
  const cleaned = input
    .replace(/[\s\u00a0\u202f₽]/g, '')
    .replace(/руб\.?/gi, '')
    .replace(',', '.');
  if (!/^-?\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? rubles(value) : null;
}
