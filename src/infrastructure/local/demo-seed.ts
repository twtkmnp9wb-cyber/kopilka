import {
  DEFAULT_CATEGORIES,
  addMonths,
  compareDates,
  dateInMonth,
  daysInMonth,
  monthOf,
  rubles,
  type Category,
  type Goal,
  type IsoDate,
  type RecurringItem,
  type Transaction,
} from '@/domain';
import type { LocalRepositories } from './local-repositories';

/** Детерминированный ГПСЧ (mulberry32): демо-данные одинаковые при каждом запуске. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SpendingPattern {
  readonly category: string;
  /** Сколько раз за месяц. */
  readonly times: number;
  readonly min: number;
  readonly max: number;
  readonly notes: readonly string[];
}

const PATTERNS: readonly SpendingPattern[] = [
  {
    category: 'Продукты',
    times: 10,
    min: 300,
    max: 1200,
    notes: ['Пятёрочка', 'Магнит', 'ВкусВилл', ''],
  },
  {
    category: 'Кафе и доставка',
    times: 5,
    min: 250,
    max: 800,
    notes: ['Кофе', 'Шаверма', 'Самокат', ''],
  },
  { category: 'Транспорт', times: 10, min: 60, max: 250, notes: ['Метро', 'Такси', ''] },
  { category: 'Развлечения', times: 2, min: 400, max: 1200, notes: ['Кино', 'Боулинг', 'Концерт'] },
  { category: 'Покупки', times: 1, min: 800, max: 3500, notes: ['Худи', 'Наушники', 'Кроссовки'] },
  { category: 'Здоровье', times: 1, min: 300, max: 1200, notes: ['Аптека'] },
];

/**
 * Наполняет хранилище реалистичной историей студента за три прошлых месяца и текущий —
 * чтобы в демо сразу были видны графики, бюджет и прогноз.
 */
export function seedDemoData(repos: LocalRepositories, today: IsoDate): void {
  const rand = random(20261029);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T;
  const amount = (min: number, max: number) =>
    rubles(Math.round((min + rand() * (max - min)) / 10) * 10);
  let sequence = 0;
  const id = (prefix: string) => `demo-${prefix}-${(sequence += 1)}`;

  const categories: Category[] = DEFAULT_CATEGORIES.map((draft) => ({ ...draft, id: id('cat') }));
  const categoryId = (name: string) => categories.find((c) => c.name === name)?.id ?? null;

  const recurring: RecurringItem[] = [
    {
      kind: 'income',
      name: 'Подработка в кофейне',
      amount: rubles(58_000),
      dayOfMonth: 10,
      categoryId: categoryId('Зарплата'),
    },
    {
      kind: 'income',
      name: 'Стипендия',
      amount: rubles(4_500),
      dayOfMonth: 25,
      categoryId: categoryId('Стипендия'),
    },
    {
      kind: 'expense',
      name: 'Комната',
      amount: rubles(15_000),
      dayOfMonth: 1,
      categoryId: categoryId('Жильё'),
    },
    {
      kind: 'expense',
      name: 'Мобильный и интернет',
      amount: rubles(650),
      dayOfMonth: 15,
      categoryId: categoryId('Связь и интернет'),
    },
    {
      kind: 'expense',
      name: 'Музыка и кино',
      amount: rubles(499),
      dayOfMonth: 20,
      categoryId: categoryId('Подписки'),
    },
  ].map((item) => ({
    ...item,
    kind: item.kind as RecurringItem['kind'],
    active: true,
    id: id('rec'),
  }));

  const current = monthOf(today);
  const goals: Goal[] = [
    {
      name: 'Ноутбук для учёбы',
      emoji: '💻',
      target: rubles(85_000),
      deadline: dateInMonth(addMonths(current, 5), 31),
      createdOn: dateInMonth(addMonths(current, -3), 3),
    },
    {
      name: 'Подушка безопасности',
      emoji: '🛟',
      target: rubles(60_000),
      deadline: dateInMonth(addMonths(current, 9), 31),
      createdOn: dateInMonth(addMonths(current, -2), 12),
    },
    {
      name: 'Поездка в Питер',
      emoji: '🚆',
      target: rubles(24_000),
      deadline: dateInMonth(addMonths(current, 2), 28),
      createdOn: dateInMonth(addMonths(current, -1), 5),
    },
  ].map((goal) => ({ ...goal, archived: false, id: id('goal') }));

  const transactions: Transaction[] = [];
  const push = (t: Omit<Transaction, 'id'>) => {
    if (compareDates(t.date, today) <= 0) transactions.push({ ...t, id: id('tx') });
  };

  for (let offset = -3; offset <= 0; offset += 1) {
    const month = addMonths(current, offset);
    const days = daysInMonth(month);

    for (const item of recurring) {
      push({
        type: item.kind,
        amount: item.amount,
        date: dateInMonth(month, item.dayOfMonth),
        categoryId: item.categoryId,
        goalId: null,
        note: item.name,
      });
    }

    for (const pattern of PATTERNS) {
      // Небольшой разброс от месяца к месяцу, чтобы прогноз получил честный коридор.
      const times = Math.max(1, Math.round(pattern.times * (0.75 + rand() * 0.5)));
      for (let i = 0; i < times; i += 1) {
        push({
          type: 'expense',
          amount: amount(pattern.min, pattern.max),
          date: dateInMonth(month, 1 + Math.floor(rand() * days)),
          categoryId: categoryId(pattern.category),
          goalId: null,
          note: pick(pattern.notes),
        });
      }
    }

    const savingDay = dateInMonth(month, 11);
    goals.forEach((goal, index) => {
      if (compareDates(goal.createdOn, savingDay) > 0) return;
      push({
        type: 'saving',
        amount: rubles([9_000, 4_000, 6_000][index] ?? 3_000),
        date: savingDay,
        categoryId: null,
        goalId: goal.id,
        note: '',
      });
    });
  }

  repos.categories.write(categories);
  repos.recurring.write(recurring);
  repos.goals.write(goals);
  repos.transactions.write(transactions);
}
