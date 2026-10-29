// Мелкие настройки интерфейса конкретного браузера (тема, режим). Чтение и запись
// обёрнуты в try/catch: localStorage бывает недоступен — тогда просто живём без памяти.

export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(`kopilka:${key}`);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(`kopilka:${key}`);
    else window.localStorage.setItem(`kopilka:${key}`, value);
  } catch {
    // без сохранения — не страшно
  }
}
