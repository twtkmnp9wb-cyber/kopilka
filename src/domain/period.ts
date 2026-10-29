/** Календарная дата без времени в часовом поясе пользователя: «2026-10-29». */
export type IsoDate = string;

/** Календарный месяц: «2026-10». */
export type MonthKey = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

const pad = (value: number): string => String(value).padStart(2, '0');

export function isIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isMonthKey(value: string): value is MonthKey {
  const match = MONTH_KEY.exec(value);
  return match !== null && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

export const toIsoDate = (date: Date): IsoDate =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Полночь указанной даты по местному времени. */
export function parseIsoDate(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function parseMonth(month: MonthKey): { year: number; index: number } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return { year: y, index: m - 1 };
}

const fromParts = (year: number, index: number): MonthKey => {
  const normalized = new Date(year, index, 1);
  return `${normalized.getFullYear()}-${pad(normalized.getMonth() + 1)}`;
};

export const monthOf = (date: IsoDate): MonthKey => date.slice(0, 7);

export function addMonths(month: MonthKey, count: number): MonthKey {
  const { year, index } = parseMonth(month);
  return fromParts(year, index + count);
}

/** Сколько месяцев от `from` до `to`: для соседних месяцев — 1, для одного и того же — 0. */
export function monthsBetween(from: MonthKey, to: MonthKey): number {
  const a = parseMonth(from);
  const b = parseMonth(to);
  return (b.year - a.year) * 12 + (b.index - a.index);
}

export function daysInMonth(month: MonthKey): number {
  const { year, index } = parseMonth(month);
  return new Date(year, index + 1, 0).getDate();
}

export const dayOfMonth = (date: IsoDate): number => Number(date.slice(8, 10));

export const firstDayOf = (month: MonthKey): IsoDate => `${month}-01`;

export const lastDayOf = (month: MonthKey): IsoDate => `${month}-${pad(daysInMonth(month))}`;

/** Дата `day`-го числа месяца; 31-е в коротком месяце превращается в последний день. */
export const dateInMonth = (month: MonthKey, day: number): IsoDate =>
  `${month}-${pad(Math.min(Math.max(day, 1), daysInMonth(month)))}`;

/** `count` месяцев подряд, начиная с `from`. */
export const monthSequence = (from: MonthKey, count: number): MonthKey[] =>
  Array.from({ length: Math.max(count, 0) }, (_, offset) => addMonths(from, offset));

/** `count` месяцев, закончившихся до `month` (не включая его), от старых к новым. */
export const previousMonths = (month: MonthKey, count: number): MonthKey[] =>
  monthSequence(addMonths(month, -count), count);

export const compareDates = (a: IsoDate, b: IsoDate): number => (a < b ? -1 : a > b ? 1 : 0);

/** Дней до конца месяца, включая саму дату. */
export const daysLeftInMonth = (date: IsoDate): number =>
  daysInMonth(monthOf(date)) - dayOfMonth(date) + 1;

export function addDays(date: IsoDate, count: number): IsoDate {
  const parsed = parseIsoDate(date);
  parsed.setDate(parsed.getDate() + count);
  return toIsoDate(parsed);
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** «Октябрь 2026» / «окт». */
export function formatMonth(month: MonthKey, style: 'long' | 'short' = 'long'): string {
  const { year, index } = parseMonth(month);
  const date = new Date(year, index, 1);
  if (style === 'short') {
    return new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date).replace('.', '');
  }
  return `${capitalize(new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date))} ${year}`;
}

/** «29 октября», с годом — если он не текущий. */
export function formatDay(date: IsoDate, today: IsoDate): string {
  const parsed = parseIsoDate(date);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(parsed);
}

/** «Сегодня», «Вчера» или «29 октября, среда». */
export function formatDayHeading(date: IsoDate, today: IsoDate): string {
  if (date === today) return 'Сегодня';
  if (date === addDays(today, -1)) return 'Вчера';
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(parseIsoDate(date));
  return `${formatDay(date, today)}, ${weekday}`;
}
