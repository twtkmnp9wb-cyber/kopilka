import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dateInMonth,
  daysInMonth,
  daysLeftInMonth,
  formatMonth,
  isIsoDate,
  monthsBetween,
  previousMonths,
} from './period';

describe('period', () => {
  it('сдвигает месяцы через границу года', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('считает расстояние между месяцами', () => {
    expect(monthsBetween('2026-10', '2027-03')).toBe(5);
    expect(monthsBetween('2026-10', '2026-10')).toBe(0);
    expect(monthsBetween('2026-10', '2026-08')).toBe(-2);
  });

  it('знает длину месяца, включая високосный февраль', () => {
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysLeftInMonth('2026-10-29')).toBe(3);
  });

  it('переносит 31-е число на последний день короткого месяца', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
  });

  it('возвращает предыдущие месяцы от старых к новым', () => {
    expect(previousMonths('2026-02', 3)).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('проверяет даты', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('29.10.2026')).toBe(false);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('пишет месяц по-русски', () => {
    expect(formatMonth('2026-10')).toBe('Октябрь 2026');
  });
});
