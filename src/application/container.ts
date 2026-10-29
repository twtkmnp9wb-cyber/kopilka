import type { AuthService } from './ports';
import type { UseCases } from './use-cases';

export type AppMode = 'cloud' | 'demo';

/** То, что composition root отдаёт интерфейсу: сценарии и авторизация, без деталей хранилищ. */
export interface AppContainer {
  readonly mode: AppMode;
  readonly auth: AuthService;
  readonly useCases: UseCases;
}
