/** Направление денежного потока. */
export type FlowKind = 'income' | 'expense';

/**
 * Цвет категории — имя слота палитры, а не hex: конкретный оттенок
 * для светлой и тёмной темы выбирает UI.
 */
export const CATEGORY_COLORS = [
  'blue',
  'orange',
  'aqua',
  'yellow',
  'magenta',
  'green',
  'violet',
  'red',
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

/** Иконка категории — ключ из фиксированного набора, отрисовку знает UI. */
export const CATEGORY_ICONS = [
  'cart',
  'coffee',
  'bus',
  'home',
  'phone',
  'heart',
  'film',
  'shirt',
  'gift',
  'wallet',
  'briefcase',
  'graduation',
  'sparkles',
  'plane',
  'paw',
  'book',
  'dumbbell',
  'zap',
  'repeat',
  'more',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly kind: FlowKind;
  /**
   * Обязательная категория (жильё, связь, подписки): такие траты планируются
   * регулярными платежами и не съедают свободный лимит.
   */
  readonly essential: boolean;
  readonly color: CategoryColor;
  readonly icon: CategoryIcon;
  readonly archived: boolean;
  readonly sort: number;
}

export type CategoryDraft = Omit<Category, 'id'>;

const DEFAULT_CATEGORY_SPECS: ReadonlyArray<Omit<CategoryDraft, 'archived' | 'sort'>> = [
  { name: 'Продукты', kind: 'expense', essential: false, color: 'aqua', icon: 'cart' },
  { name: 'Кафе и доставка', kind: 'expense', essential: false, color: 'orange', icon: 'coffee' },
  { name: 'Транспорт', kind: 'expense', essential: false, color: 'blue', icon: 'bus' },
  { name: 'Развлечения', kind: 'expense', essential: false, color: 'magenta', icon: 'film' },
  { name: 'Покупки', kind: 'expense', essential: false, color: 'violet', icon: 'shirt' },
  { name: 'Здоровье', kind: 'expense', essential: false, color: 'red', icon: 'heart' },
  { name: 'Подарки', kind: 'expense', essential: false, color: 'yellow', icon: 'gift' },
  { name: 'Жильё', kind: 'expense', essential: true, color: 'green', icon: 'home' },
  { name: 'Связь и интернет', kind: 'expense', essential: true, color: 'blue', icon: 'phone' },
  { name: 'Подписки', kind: 'expense', essential: true, color: 'violet', icon: 'repeat' },
  { name: 'Другое', kind: 'expense', essential: false, color: 'yellow', icon: 'more' },
  { name: 'Зарплата', kind: 'income', essential: false, color: 'aqua', icon: 'briefcase' },
  { name: 'Стипендия', kind: 'income', essential: false, color: 'blue', icon: 'graduation' },
  { name: 'Подработка', kind: 'income', essential: false, color: 'violet', icon: 'zap' },
  { name: 'Подарили', kind: 'income', essential: false, color: 'magenta', icon: 'gift' },
];

export const DEFAULT_CATEGORIES: readonly CategoryDraft[] = DEFAULT_CATEGORY_SPECS.map(
  (category, index) => ({ ...category, archived: false, sort: index }),
);
