import { describe, expect, it } from 'vitest';
import { rubles } from '../money';
import * as build from '../testing/builders';
import { planBudget } from './budget-planner';
import { dailyAllowance } from './daily-allowance';
import { forecast } from './forecaster';
import { planGoal } from './goal-planner';
import { Ledger } from './ledger';

const food = build.category({ name: 'Продукты' });
const cafe = build.category({ name: 'Кафе' });
const rent = build.category({ name: 'Жильё', essential: true });
const salary = build.category({ name: 'Зарплата', kind: 'income' });
const categories = [food, cafe, rent, salary];

describe('planGoal', () => {
  const goal = build.goal({
    target: rubles(50_000),
    createdOn: '2026-08-01',
    deadline: '2026-12-31',
  });

  it('считает взнос от остатка на начало месяца и отставание от графика', () => {
    const ledger = new Ledger([
      build.saving(10_000, '2026-08-10', goal.id),
      build.saving(5_000, '2026-09-10', goal.id),
      build.saving(2_000, '2026-10-03', goal.id),
    ]);
    const progress = planGoal(goal, ledger, '2026-10');

    expect(progress.saved).toBe(rubles(17_000));
    expect(progress.monthsLeft).toBe(3);
    expect(progress.monthlyRequired).toBe(rubles(11_667));
    expect(progress.savedThisMonth).toBe(rubles(2_000));
    expect(progress.dueThisMonth).toBe(rubles(9_667));
    expect(progress.behindBy).toBe(rubles(5_000));
    expect(progress.status).toBe('behind');
  });

  it('отмечает достигнутые и просроченные цели', () => {
    const reached = new Ledger([build.saving(50_000, '2026-09-01', goal.id)]);
    expect(planGoal(goal, reached, '2026-10').status).toBe('reached');

    const overdue = planGoal(goal, new Ledger([]), '2027-01');
    expect(overdue.status).toBe('overdue');
    expect(overdue.monthlyRequired).toBe(rubles(50_000));
  });
});

describe('planBudget + dailyAllowance', () => {
  const laptop = build.goal({ target: rubles(60_000), deadline: '2027-03-31' });
  const recurring = [
    build.recurring({ kind: 'income', amount: rubles(50_000) }),
    build.recurring({
      kind: 'expense',
      name: 'Аренда',
      amount: rubles(20_000),
      categoryId: rent.id,
    }),
  ];
  const transactions = [
    // История сентября: продукты к кафе как 2:1.
    build.expense(6_000, '2026-09-10', food.id),
    build.expense(3_000, '2026-09-12', cafe.id),
    // Октябрь.
    build.income(50_000, '2026-10-05', salary.id),
    build.expense(20_000, '2026-10-06', rent.id),
    build.expense(9_000, '2026-10-20', food.id),
    build.expense(500, '2026-10-29', cafe.id),
  ];
  const ledger = new Ledger(transactions);
  const plan = planBudget({
    month: '2026-10',
    ledger,
    categories,
    recurring,
    goals: [laptop],
    settings: build.settings({ cushionPercent: 10 }),
  });

  it('свободный лимит = доход − обязательные − цели − подушка', () => {
    expect(plan.income.expected).toBe(rubles(50_000));
    expect(plan.income.source).toBe('recurring');
    expect(plan.mandatory.expected).toBe(rubles(20_000));
    expect(plan.goalsAllocation).toBe(rubles(10_000));
    expect(plan.cushion).toBe(rubles(5_000));
    expect(plan.free).toBe(rubles(15_000));
    expect(plan.shortfall).toBe(0);
  });

  it('раскладывает лимит по категориям пропорционально истории', () => {
    const limits = Object.fromEntries(plan.categories.map((c) => [c.category.name, c.limit]));
    expect(limits).toEqual({ Продукты: rubles(10_000), Кафе: rubles(5_000) });
    const foodBudget = plan.categories.find((c) => c.category.id === food.id);
    expect(foodBudget?.spent).toBe(rubles(9_000));
  });

  it('дневной лимит — остаток на начало дня, делённый на оставшиеся дни', () => {
    const allowance = dailyAllowance(plan, ledger, categories, '2026-10-29');
    expect(allowance.daysLeft).toBe(3);
    expect(allowance.dailyLimit).toBe(rubles(2_000));
    expect(allowance.spentToday).toBe(rubles(500));
    expect(allowance.leftToday).toBe(rubles(1_500));
    expect(allowance.leftInMonth).toBe(rubles(5_500));
    expect(allowance.state).toBe('ok');
  });

  it('перерасход вчера уменьшает лимит на сегодня', () => {
    const overspent = new Ledger([...transactions, build.expense(3_000, '2026-10-28', cafe.id)]);
    const allowance = dailyAllowance(plan, overspent, categories, '2026-10-29');
    expect(allowance.dailyLimit).toBe(rubles(1_000));
    expect(allowance.leftToday).toBe(rubles(500));
  });

  it('если цели не влезают в доход, предлагает реальный срок', () => {
    const tight = planBudget({
      month: '2026-10',
      ledger: new Ledger([build.expense(4_000, '2026-09-10', food.id)]),
      categories,
      recurring: [
        build.recurring({ kind: 'income', amount: rubles(30_000) }),
        build.recurring({ kind: 'expense', amount: rubles(20_000), categoryId: rent.id }),
      ],
      goals: [laptop],
      settings: build.settings({ cushionPercent: 10 }),
    });
    expect(tight.free).toBe(rubles(-3_000));
    expect(tight.shortfall).toBe(rubles(3_000));
    expect(tight.categories.every((c) => c.limit === 0)).toBe(true);
    expect(tight.suggestions).toHaveLength(1);
    expect(tight.suggestions[0]?.realisticMonth).toBe('2028-05');
  });

  it('без регулярных доходов берёт среднее за прошлые месяцы', () => {
    const fromHistory = planBudget({
      month: '2026-10',
      ledger: new Ledger([
        build.income(40_000, '2026-08-05', salary.id),
        build.income(60_000, '2026-09-05', salary.id),
      ]),
      categories,
      recurring: [],
      goals: [],
      settings: build.settings({ cushionPercent: 0 }),
    });
    expect(fromHistory.income.expected).toBe(rubles(50_000));
    expect(fromHistory.income.source).toBe('history');
  });
});

describe('forecast', () => {
  it('растит накопления на ожидаемый прирост и строит коридор', () => {
    const ledger = new Ledger([
      build.income(50_000, '2026-09-05', salary.id),
      build.expense(10_000, '2026-09-15', food.id),
      build.income(50_000, '2026-10-05', salary.id),
      build.expense(4_000, '2026-10-10', food.id),
    ]);
    const plan = planBudget({
      month: '2026-10',
      ledger,
      categories,
      recurring: [build.recurring({ kind: 'income', amount: rubles(50_000) })],
      goals: [],
      settings: build.settings({ cushionPercent: 10 }),
    });
    const result = forecast({ plan, ledger, categories, today: '2026-10-15', horizon: 3 });

    expect(result.monthlyNet).toBe(rubles(40_000));
    expect(result.points.map((p) => [p.month, p.kind, p.total])).toEqual([
      ['2026-09', 'actual', rubles(40_000)],
      ['2026-10', 'forecast', rubles(80_000)],
      ['2026-11', 'forecast', rubles(120_000)],
      ['2026-12', 'forecast', rubles(160_000)],
    ]);
    const first = result.points[1];
    expect(first && first.high - first.total).toBe(rubles(1_500));
  });

  it('переводит взносы в цели и отмечает месяц достижения', () => {
    const goal = build.goal({
      target: rubles(20_000),
      deadline: '2026-11-30',
      createdOn: '2026-10-01',
    });
    const ledger = new Ledger([build.income(50_000, '2026-10-05', salary.id)]);
    const plan = planBudget({
      month: '2026-10',
      ledger,
      categories,
      recurring: [build.recurring({ kind: 'income', amount: rubles(50_000) })],
      goals: [goal],
      settings: build.settings({ cushionPercent: 0 }),
    });
    const result = forecast({ plan, ledger, categories, today: '2026-10-15', horizon: 3 });

    expect(result.milestones).toEqual([{ goalId: goal.id, month: '2026-11' }]);
    const last = result.points.at(-1);
    expect(last?.inGoals).toBe(rubles(20_000));
  });
});
