import {
  BookOpen,
  Briefcase,
  Bus,
  Coffee,
  Dumbbell,
  Ellipsis,
  Film,
  Gift,
  GraduationCap,
  Heart,
  House,
  PawPrint,
  Plane,
  Repeat,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryColor, CategoryIcon } from '@/domain';

// Домен хранит только ключи иконок и цветов, а как они выглядят — решает UI.

export const CATEGORY_ICON_COMPONENTS: Record<CategoryIcon, LucideIcon> = {
  cart: ShoppingCart,
  coffee: Coffee,
  bus: Bus,
  home: House,
  phone: Smartphone,
  heart: Heart,
  film: Film,
  shirt: Shirt,
  gift: Gift,
  wallet: Wallet,
  briefcase: Briefcase,
  graduation: GraduationCap,
  sparkles: Sparkles,
  plane: Plane,
  paw: PawPrint,
  book: BookOpen,
  dumbbell: Dumbbell,
  zap: Zap,
  repeat: Repeat,
  more: Ellipsis,
};

export const categoryColorVar = (color: CategoryColor | 'neutral'): string => `var(--cat-${color})`;

export const COLOR_LABELS: Record<CategoryColor, string> = {
  blue: 'Синий',
  orange: 'Оранжевый',
  aqua: 'Бирюзовый',
  yellow: 'Жёлтый',
  magenta: 'Розовый',
  green: 'Зелёный',
  violet: 'Фиолетовый',
  red: 'Красный',
};

interface CategoryBadgeProps {
  readonly icon: CategoryIcon;
  readonly color: CategoryColor | 'neutral';
  readonly size?: number;
}

/** Круглая плашка категории: иконка на полупрозрачном фоне её цвета. */
export function CategoryBadge({ icon, color, size = 40 }: CategoryBadgeProps) {
  const Icon = CATEGORY_ICON_COMPONENTS[icon];
  const tone = categoryColorVar(color);
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flex: 'none',
        display: 'inline-grid',
        placeItems: 'center',
        borderRadius: '50%',
        color: tone,
        background: `color-mix(in srgb, ${tone} 18%, transparent)`,
      }}
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2} />
    </span>
  );
}
