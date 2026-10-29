/** Минимальное синхронное key-value хранилище — localStorage в браузере, Map в тестах. */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, string>();

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }
}

/**
 * localStorage может быть недоступен (приватный режим, запрет cookies) или бросать
 * исключения при записи — тогда тихо работаем в памяти, чтобы интерфейс не падал.
 */
export class BrowserStore implements KeyValueStore {
  private readonly fallback = new MemoryStore();

  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key) ?? this.fallback.get(key);
    } catch {
      return this.fallback.get(key);
    }
  }

  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      this.fallback.set(key, value);
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ничего: запись и так могла жить только в памяти
    }
    this.fallback.remove(key);
  }
}
