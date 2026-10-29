import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES, rubles } from '@/domain';
// Тест сценариев на настоящих локальных репозиториях поверх памяти — без моков.
// eslint-disable-next-line no-restricted-imports
import { createLocalRepositories } from '@/infrastructure/local/local-repositories';
// eslint-disable-next-line no-restricted-imports
import { MemoryStore } from '@/infrastructure/storage/key-value-store';
import { AppError } from './ports';
import { transactionFormSchema } from './schemas';
import { createUseCases } from './use-cases';

const setup = () => {
  const repos = createLocalRepositories(new MemoryStore(), 'test');
  const useCases = createUseCases(repos, { today: () => '2026-10-29' });
  return { repos, useCases };
};

describe('use-cases', () => {
  it('при первом входе создаёт стандартные категории ровно один раз', async () => {
    const { useCases } = setup();
    const [first, second] = await Promise.all([
      useCases.categories.listOrSeed(),
      useCases.categories.listOrSeed(),
    ]);
    expect(first).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(second).toBe(first);
    expect(await useCases.categories.listOrSeed()).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('не сохраняет операцию, нарушающую инварианты', async () => {
    const { useCases } = setup();
    await expect(
      useCases.transactions.save({
        type: 'expense',
        amount: rubles(100),
        date: '2026-10-29',
        categoryId: null,
        goalId: null,
        note: '',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('взнос в цель — это перевод на сегодня; удаление цели удаляет её переводы', async () => {
    const { useCases } = setup();
    const goal = await useCases.goals.save({
      name: 'Велосипед',
      emoji: '🚲',
      target: rubles(30_000),
      deadline: '2027-05-31',
      createdOn: '2026-10-29',
      archived: false,
    });
    const contribution = await useCases.goals.contribute(goal.id, rubles(5_000));
    expect(contribution).toMatchObject({ type: 'saving', date: '2026-10-29', goalId: goal.id });

    await useCases.goals.remove(goal.id);
    expect(await useCases.transactions.list()).toEqual([]);
  });

  it('удалённую операцию можно вернуть', async () => {
    const { useCases } = setup();
    const [category] = await useCases.categories.listOrSeed();
    const saved = await useCases.transactions.save({
      type: 'expense',
      amount: rubles(250),
      date: '2026-10-29',
      categoryId: category?.id ?? null,
      goalId: null,
      note: 'Кофе',
    });
    await useCases.transactions.remove(saved.id);
    await useCases.transactions.restore(saved);
    const [restored] = await useCases.transactions.list();
    expect(restored).toMatchObject({ amount: rubles(250), note: 'Кофе' });
  });

  it('форма операции превращает ввод в черновик и знак перевода', () => {
    const draft = transactionFormSchema.parse({
      type: 'saving',
      amount: '1 500',
      date: '2026-10-29',
      categoryId: 'ignored',
      goalId: 'goal-1',
      withdraw: true,
      note: '  ',
    });
    expect(draft).toEqual({
      type: 'saving',
      amount: rubles(-1_500),
      date: '2026-10-29',
      categoryId: null,
      goalId: 'goal-1',
      note: '',
    });

    const invalid = transactionFormSchema.safeParse({
      type: 'expense',
      amount: '0',
      date: '2026-10-29',
      categoryId: null,
      goalId: null,
      withdraw: false,
      note: '',
    });
    expect(invalid.success).toBe(false);
  });
});
