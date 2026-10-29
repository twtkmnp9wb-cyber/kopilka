import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrudRepository } from '@/application';
import { toAppError } from './errors';

/** Как сущность хранится в таблице: имя, порядок и преобразования row ↔ entity. */
export interface TableMapping<TEntity, TDraft> {
  readonly table: string;
  readonly order: ReadonlyArray<{ readonly column: string; readonly ascending: boolean }>;
  /** Разбирает строку из базы (с проверкой схемы) в сущность. */
  parse(row: unknown): TEntity;
  /** Переводит черновик или его часть в колонки таблицы. */
  toRow(patch: Partial<TDraft>): Record<string, unknown>;
}

/** PostgREST отдаёт не больше 1000 строк за запрос — читаем страницами. */
const PAGE_SIZE = 1000;

export class SupabaseCrudRepository<
  TEntity extends { readonly id: string },
  TDraft,
> implements CrudRepository<TEntity, TDraft> {
  constructor(
    private readonly client: SupabaseClient,
    private readonly mapping: TableMapping<TEntity, TDraft>,
  ) {}

  async list(): Promise<TEntity[]> {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = this.client.from(this.mapping.table).select('*');
      for (const { column, ascending } of this.mapping.order)
        query = query.order(column, { ascending });
      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw toAppError(error);
      rows.push(...data);
      if (data.length < PAGE_SIZE) break;
    }
    return rows.map((row) => this.mapping.parse(row));
  }

  async create(draft: TDraft): Promise<TEntity> {
    const [created] = await this.createMany([draft]);
    if (!created) throw toAppError(null, 'Не удалось сохранить');
    return created;
  }

  async createMany(drafts: readonly TDraft[]): Promise<TEntity[]> {
    if (drafts.length === 0) return [];
    const { data, error } = await this.client
      .from(this.mapping.table)
      .insert(drafts.map((draft) => this.mapping.toRow(draft)))
      .select('*');
    if (error) throw toAppError(error, 'Не удалось сохранить');
    return data.map((row) => this.mapping.parse(row));
  }

  async update(id: string, patch: Partial<TDraft>): Promise<TEntity> {
    const { data, error } = await this.client
      .from(this.mapping.table)
      .update(this.mapping.toRow(patch))
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw toAppError(error, 'Не удалось сохранить изменения');
    return this.mapping.parse(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from(this.mapping.table).delete().eq('id', id);
    if (error) throw toAppError(error, 'Не удалось удалить');
  }
}
