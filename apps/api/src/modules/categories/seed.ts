import { PrismaClient } from '@prisma/client';

export const seedDefaultUserData = async (prisma: PrismaClient, userId: string) => {
  // 1. Seed Wallets / Accounts with 0 initial balance for clean user start
  const defaultAccounts = [
    { name: 'Cash', type: 'CASH' as const, balance: 0, budgetLimit: null },
    { name: 'Kpay', type: 'MOBILE_WALLET' as const, balance: 0, budgetLimit: null }
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.create({
      data: {
        userId,
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        budgetLimit: acc.budgetLimit
      }
    });
  }

  // 2. Seed Expense Categories from User's Finance Sheet
  const defaultExpenseCategories = [
    { name: 'Parent', icon: 'Heart', color: '#EC4899' },
    { name: 'School Fees', icon: 'GraduationCap', color: '#3B82F6' },
    { name: 'Wifi & Meter', icon: 'Zap', color: '#EAB308' },
    { name: 'Fuel', icon: 'Fuel', color: '#F97316' },
    { name: 'Night Snacks', icon: 'Moon', color: '#8B5CF6' },
    { name: 'With Family', icon: 'Users', color: '#10B981' },
    { name: 'With Love', icon: 'HeartHandshake', color: '#F43F5E' },
    { name: 'With Friends', icon: 'Smile', color: '#06B6D4' },
    { name: 'Mine', icon: 'User', color: '#6366F1' },
    { name: 'Other Snacks', icon: 'Coffee', color: '#D97706' },
    { name: 'Others', icon: 'MoreHorizontal', color: '#6B7280' },
    { name: 'Education', icon: 'BookOpen', color: '#2563EB' },
    { name: 'Savings', icon: 'PiggyBank', color: '#059669' },
    { name: 'Investment', icon: 'TrendingUp', color: '#0D9488' },
    { name: 'Savings with Love', icon: 'Sparkles', color: '#BE185D' },
    { name: 'Kpay', icon: 'Smartphone', color: '#1E40AF' }
  ];

  for (const cat of defaultExpenseCategories) {
    await prisma.category.create({
      data: {
        userId,
        name: cat.name,
        type: 'EXPENSE',
        icon: cat.icon,
        color: cat.color
      }
    });
  }

  // 3. Seed Income Categories
  const defaultIncomeCategories = [
    { name: 'Salary', icon: 'Briefcase', color: '#16A34A' },
    { name: 'Learnex Course', icon: 'Video', color: '#2563EB' },
    { name: 'Investment Return', icon: 'TrendingUp', color: '#0D9488' },
    { name: 'Other Income', icon: 'Coins', color: '#CA8A04' }
  ];

  for (const cat of defaultIncomeCategories) {
    await prisma.category.create({
      data: {
        userId,
        name: cat.name,
        type: 'INCOME',
        icon: cat.icon,
        color: cat.color
      }
    });
  }
};
