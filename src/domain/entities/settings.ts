export interface BudgetSettings {
  /** Какой процент ожидаемого дохода откладывать в «подушку» до распределения лимитов. */
  readonly cushionPercent: number;
  /** Горизонт прогноза в месяцах. */
  readonly forecastMonths: number;
}

export const SETTINGS_LIMITS = {
  cushionPercent: { min: 0, max: 50 },
  forecastMonths: { min: 3, max: 24 },
} as const;

export const DEFAULT_SETTINGS: BudgetSettings = {
  cushionPercent: 10,
  forecastMonths: 12,
};
