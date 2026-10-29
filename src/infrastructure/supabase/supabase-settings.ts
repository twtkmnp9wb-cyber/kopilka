import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { SettingsRepository } from '@/application';
import { DEFAULT_SETTINGS, type BudgetSettings } from '@/domain';
import { toAppError } from './errors';

const settingsRow = z.object({
  cushion_percent: z.number().int(),
  forecast_months: z.number().int(),
});

/** Одна строка настроек на пользователя; пока её нет — действуют значения по умолчанию. */
export class SupabaseSettingsRepository implements SettingsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async get(): Promise<BudgetSettings> {
    const { data, error } = await this.client
      .from('fin_settings')
      .select('cushion_percent, forecast_months')
      .maybeSingle();
    if (error) throw toAppError(error);
    if (!data) return DEFAULT_SETTINGS;
    const row = settingsRow.parse(data);
    return { cushionPercent: row.cushion_percent, forecastMonths: row.forecast_months };
  }

  async save(settings: BudgetSettings): Promise<BudgetSettings> {
    const { data: auth } = await this.client.auth.getSession();
    const userId = auth.session?.user.id;
    if (!userId) throw toAppError({ code: 'PGRST301' });
    const { error } = await this.client.from('fin_settings').upsert(
      {
        user_id: userId,
        cushion_percent: settings.cushionPercent,
        forecast_months: settings.forecastMonths,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw toAppError(error, 'Не удалось сохранить настройки');
    return settings;
  }
}
