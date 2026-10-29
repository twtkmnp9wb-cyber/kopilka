import { describe, expect, it } from 'vitest';
import { ceilToRuble, formatMoney, parseMoney, rubles, splitProportionally } from './money';

const nbsp = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

describe('money', () => {
  it('хранит суммы в копейках без ошибок плавающей точки', () => {
    expect(rubles(0.1) + rubles(0.2)).toBe(rubles(0.3));
    expect(rubles(1234.56)).toBe(123456);
  });

  it('форматирует рубли, копейки показывает только когда они есть', () => {
    expect(nbsp(formatMoney(rubles(12345)))).toBe('12 345 ₽');
    expect(nbsp(formatMoney(rubles(12345.5)))).toBe('12 345,50 ₽');
    expect(nbsp(formatMoney(rubles(500), { signed: true }))).toBe('+500 ₽');
    expect(nbsp(formatMoney(rubles(-500), { signed: true }))).toBe('-500 ₽');
  });

  it('разбирает пользовательский ввод', () => {
    expect(parseMoney('1 234,5')).toBe(123450);
    expect(parseMoney('1234.56')).toBe(123456);
    expect(parseMoney('2 000 ₽')).toBe(200000);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('12,345')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });

  it('округляет взнос вверх до рубля', () => {
    expect(ceilToRuble(10001)).toBe(10100);
    expect(ceilToRuble(10000)).toBe(10000);
  });

  describe('splitProportionally', () => {
    it('делит по весам, и сумма частей равна целому', () => {
      const parts = splitProportionally(rubles(1000), [1, 1, 1]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(rubles(1000));
      expect(parts).toEqual([rubles(334), rubles(333), rubles(333)]);
    });

    it('при нулевых весах делит поровну', () => {
      expect(splitProportionally(rubles(100), [0, 0])).toEqual([rubles(50), rubles(50)]);
    });

    it('учитывает пропорции', () => {
      expect(splitProportionally(rubles(900), [2, 1])).toEqual([rubles(600), rubles(300)]);
    });

    it('копеечный остаток уходит в первую часть', () => {
      const parts = splitProportionally(10050, [1, 1]);
      expect(parts).toEqual([5050, 5000]);
    });

    it('неположительная сумма даёт нули', () => {
      expect(splitProportionally(-100, [1, 2])).toEqual([0, 0]);
    });
  });
});
