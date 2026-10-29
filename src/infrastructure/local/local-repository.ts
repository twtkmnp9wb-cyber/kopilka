import { AppError, type CrudRepository, type SettingsRepository } from '@/application';
import { DEFAULT_SETTINGS, type BudgetSettings } from '@/domain';
import type { KeyValueStore } from '../storage/key-value-store';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Хранилище коллекции целиком в одном ключе key-value стора (демо-режим и тесты). */
export class LocalCrudRepository<
  TEntity extends { readonly id: string },
  TDraft extends object,
> implements CrudRepository<TEntity, TDraft> {
  constructor(
    private readonly store: KeyValueStore,
    private readonly key: string,
    /** Каскадное удаление и прочие связи между коллекциями. */
    private readonly hooks: { onRemove?: (id: string) => void } = {},
  ) {}

  read(): TEntity[] {
    const raw = this.store.get(this.key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as TEntity[]) : [];
    } catch {
      return [];
    }
  }

  write(items: readonly TEntity[]): void {
    this.store.set(this.key, JSON.stringify(items));
  }

  async list(): Promise<TEntity[]> {
    return this.read();
  }

  async create(draft: TDraft): Promise<TEntity> {
    const [created] = await this.createMany([draft]);
    if (!created) throw new AppError('Не удалось сохранить', 'local-write');
    return created;
  }

  async createMany(drafts: readonly TDraft[]): Promise<TEntity[]> {
    const created = drafts.map((draft) => ({ ...draft, id: newId() }) as unknown as TEntity);
    this.write([...this.read(), ...created]);
    return created;
  }

  async update(id: string, patch: Partial<TDraft>): Promise<TEntity> {
    const items = this.read();
    const index = items.findIndex((item) => item.id === id);
    const current = items[index];
    if (!current) throw new AppError('Запись не найдена — возможно, её уже удалили', 'not-found');
    const updated = { ...current, ...patch, id } as TEntity;
    items[index] = updated;
    this.write(items);
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((item) => item.id !== id));
    this.hooks.onRemove?.(id);
  }
}

export class LocalSettingsRepository implements SettingsRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly key: string,
  ) {}

  async get(): Promise<BudgetSettings> {
    try {
      const raw = this.store.get(this.key);
      return raw
        ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<BudgetSettings>) }
        : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async save(settings: BudgetSettings): Promise<BudgetSettings> {
    this.store.set(this.key, JSON.stringify(settings));
    return settings;
  }
}
