import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '@/application';

let client: SupabaseClient | null = null;

/**
 * Один клиент на приложение. Ключ publishable — публичный по задумке:
 * доступ к данным ограничивают RLS-политики из supabase/setup.sql.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new AppError('Supabase не настроен: задай VITE_SUPABASE_URL и ключ в .env', 'config');
  }
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Свой ключ: на github.io у всех проектов автора один origin и общий localStorage.
      storageKey: 'kopilka-auth',
    },
  });
  return client;
}
