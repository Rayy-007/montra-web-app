'use client';

import React from 'react';
import {
  Banknote,
  Smartphone,
  Landmark,
  PiggyBank,
  Wallet,
  CreditCard,
  Coins,
  ShieldCheck,
  Sparkles,
  Briefcase,
} from 'lucide-react';

const WALLET_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  Banknote,
  Smartphone,
  Landmark,
  PiggyBank,
  Wallet,
  CreditCard,
  Coins,
  ShieldCheck,
  Sparkles,
  Briefcase,
};

export const WALLET_COLOR_PRESETS = [
  '#0284C7', // Sky Cyan
  '#7C3AED', // Violet
  '#4F46E5', // Indigo
  '#D97706', // Amber
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#0D9488', // Teal
  '#3B82F6', // Blue
  '#475569', // Slate
];

export const WALLET_ICON_PRESETS = [
  { id: 'Banknote', label: 'Cash' },
  { id: 'Smartphone', label: 'Mobile' },
  { id: 'Landmark', label: 'Bank' },
  { id: 'PiggyBank', label: 'Savings' },
  { id: 'Wallet', label: 'Wallet' },
  { id: 'CreditCard', label: 'Card' },
  { id: 'Coins', label: 'Coins' },
  { id: 'ShieldCheck', label: 'Safe' },
  { id: 'Briefcase', label: 'Work' },
  { id: 'Sparkles', label: 'Special' },
];

export function getDefaultWalletColor(type?: string | null): string {
  switch (type) {
    case 'MOBILE_WALLET':
      return '#7C3AED';
    case 'BANK':
      return '#4F46E5';
    case 'SAVINGS':
      return '#D97706';
    default:
      return '#0284C7';
  }
}

export function getDefaultWalletIcon(type?: string | null): string {
  switch (type) {
    case 'MOBILE_WALLET':
      return 'Smartphone';
    case 'BANK':
      return 'Landmark';
    case 'SAVINGS':
      return 'PiggyBank';
    default:
      return 'Banknote';
  }
}

export function getWalletVisual(
  type?: string | null,
  customColor?: string | null,
  customIcon?: string | null
) {
  const color = customColor || getDefaultWalletColor(type);
  const iconKey = customIcon || getDefaultWalletIcon(type);
  const Icon = WALLET_ICON_MAP[iconKey] || Banknote;

  return {
    Icon,
    color,
  };
}

export function WalletBadge({
  name,
  type,
  color: customColor,
  icon: customIcon,
  size = 'sm',
}: {
  name?: string | null;
  type?: string | null;
  color?: string | null;
  icon?: string | null;
  size?: 'xs' | 'sm';
}) {
  const { Icon, color } = getWalletVisual(type, customColor, customIcon);
  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-bold rounded-lg border ${
        size === 'xs' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}38`,
        color,
      }}
    >
      <Icon className={size === 'xs' ? 'w-3 h-3 flex-shrink-0' : 'w-3.5 h-3.5 flex-shrink-0'} />
      <span>{name || 'Wallet'}</span>
    </span>
  );
}
