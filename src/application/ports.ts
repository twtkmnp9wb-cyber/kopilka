import type {
  BudgetSettings,
  Category,
  CategoryDraft,
  Goal,
  GoalDraft,
  IsoDate,
  RecurringDraft,
  RecurringItem,
  Transaction,
  TransactionDraft,
} from '@/domain';

/** Общий контракт хранилища сущностей: реализации — Supabase, localStorage, память. */
export interface CrudRepository<TEntity extends { readonly id: string }, TDraft> {
  list(): Promise<TEntity[]>;
  create(draft: TDraft): Promise<TEntity>;
  createMany(drafts: readonly TDraft[]): Promise<TEntity[]>;
  update(id: string, patch: Partial<TDraft>): Promise<TEntity>;
  remove(id: string): Promise<void>;
}

export type TransactionRepository = CrudRepository<Transaction, TransactionDraft>;
export type CategoryRepository = CrudRepository<Category, CategoryDraft>;
export type GoalRepository = CrudRepository<Goal, GoalDraft>;
export type RecurringRepository = CrudRepository<RecurringItem, RecurringDraft>;

export interface SettingsRepository {
  get(): Promise<BudgetSettings>;
  save(settings: BudgetSettings): Promise<BudgetSettings>;
}

export interface Repositories {
  readonly transactions: TransactionRepository;
  readonly categories: CategoryRepository;
  readonly goals: GoalRepository;
  readonly recurring: RecurringRepository;
  readonly settings: SettingsRepository;
}

export interface UserSession {
  readonly userId: string;
  readonly email: string | null;
  /** Демо-режим: данные живут только в этом браузере. */
  readonly isDemo: boolean;
}

export type SignUpResult = { readonly status: 'signed-in' } | { readonly status: 'confirm-email' };

export interface AuthService {
  currentSession(): Promise<UserSession | null>;
  /** Подписка на вход/выход; возвращает функцию отписки. */
  onSessionChange(listener: (session: UserSession | null) => void): () => void;
  /**
   * Подписка на вход по ссылке «восстановить пароль» — пора попросить новый пароль.
   * Если ссылку разобрали раньше, чем появился слушатель, он вызывается сразу.
   */
  onPasswordRecovery(listener: () => void): () => void;
  /** Ошибка ссылки из письма (устарела, уже использована); отдаётся один раз. */
  takeLinkError(): AppError | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<SignUpResult>;
  /** Письмо со ссылкой, которая впускает в аккаунт и предлагает задать новый пароль. */
  requestPasswordReset(email: string): Promise<void>;
  /** Новый пароль текущего пользователя. */
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface Clock {
  today(): IsoDate;
}

/** Ошибка, понятная пользователю: сообщение можно показывать в интерфейсе как есть. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'AppError';
  }
}
