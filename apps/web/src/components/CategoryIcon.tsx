'use client';

import React from 'react';
import {
  Heart,
  GraduationCap,
  Zap,
  Fuel,
  Moon,
  Users,
  HeartHandshake,
  Smile,
  User,
  Coffee,
  MoreHorizontal,
  BookOpen,
  PiggyBank,
  TrendingUp,
  Sparkles,
  Smartphone,
  Briefcase,
  Video,
  Coins,
  Tag,
  Home,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Utensils,
  Car,
  Dumbbell,
  Gift,
  Stethoscope,
  Gamepad2,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Heart,
  GraduationCap,
  Zap,
  Fuel,
  Moon,
  Users,
  HeartHandshake,
  Smile,
  User,
  Coffee,
  MoreHorizontal,
  BookOpen,
  PiggyBank,
  TrendingUp,
  Sparkles,
  Smartphone,
  Briefcase,
  Video,
  Coins,
  Tag,
  Home,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Utensils,
  Car,
  Dumbbell,
  Gift,
  Stethoscope,
  Gamepad2,
};

export const CATEGORY_ICON_PRESETS = [
  { id: 'Tag', label: 'General' },
  { id: 'Utensils', label: 'Food' },
  { id: 'Coffee', label: 'Snacks' },
  { id: 'ShoppingBag', label: 'Shopping' },
  { id: 'Home', label: 'Home' },
  { id: 'Car', label: 'Transport' },
  { id: 'Fuel', label: 'Fuel' },
  { id: 'Plane', label: 'Travel' },
  { id: 'BookOpen', label: 'Education' },
  { id: 'GraduationCap', label: 'School' },
  { id: 'Heart', label: 'Family' },
  { id: 'Users', label: 'Friends' },
  { id: 'Zap', label: 'Bills' },
  { id: 'Smartphone', label: 'Phone / Pay' },
  { id: 'Stethoscope', label: 'Health' },
  { id: 'Dumbbell', label: 'Gym' },
  { id: 'Gift', label: 'Gift' },
  { id: 'Gamepad2', label: 'Fun' },
  { id: 'ShieldCheck', label: 'Safety' },
  { id: 'Sparkles', label: 'Special' },
];

export function CategoryIcon({
  icon,
  color,
  className = 'w-3.5 h-3.5',
}: {
  icon?: string | null;
  color?: string | null;
  className?: string;
}) {
  const IconComp = (icon && ICON_MAP[icon]) || Tag;
  return <IconComp className={className} style={color ? { color } : undefined} />;
}

export function CategoryBadge({
  name,
  icon,
  color,
  size = 'sm',
}: {
  name: string;
  icon?: string | null;
  color?: string | null;
  size?: 'xs' | 'sm';
}) {
  const hex = color || '#64748B';
  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-semibold rounded-lg border ${
        size === 'xs' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
      style={{
        backgroundColor: `${hex}1A`,
        borderColor: `${hex}40`,
        color: hex,
      }}
    >
      <CategoryIcon icon={icon} color={hex} className={size === 'xs' ? 'w-3 h-3 flex-shrink-0' : 'w-3.5 h-3.5 flex-shrink-0'} />
      <span>{name}</span>
    </span>
  );
}
