import prisma from '../prisma';

export interface ComputedMonthlyAccount {
  id: string;
  name: string;
  type: 'CASH' | 'MOBILE_WALLET' | 'BANK' | 'SAVINGS';
  role: 'DAILY_SPENDING' | 'RESERVE' | 'SAVINGS_HOLDING';
  startingBalance: number;
  isCarriedOver: boolean;
  balance: number;
  earmarkedSavings: number;
  availableBalance: number;
  budgetLimit: number | null;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyTransfersIn: number;
  monthlyTransfersOut: number;
  monthlyNet: number;
}

export interface MonthlyBalanceComputation {
  accounts: ComputedMonthlyAccount[];
  totalReserveDraws: number;
  reserveDrawItems: Array<{
    id: string;
    amount: number;
    date: Date;
    description: string | null;
    transferTag: string | null;
    fromAccountName: string;
    toAccountName: string;
  }>;
  totalSavedThisMonth: number;
}

/**
 * Computes monthly account balances with automatic carryover from prior months,
 * wallet-to-wallet transfer tracking, reserve drawdown detection, and savings earmarks.
 */
export async function computeMonthlyAccountsAndCoachMetrics(
  userId: string,
  month: number,
  year: number
): Promise<MonthlyBalanceComputation> {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const targetIndex = year * 12 + (month - 1);

  const [accounts, monthlyOverrides, transactionsUpToEnd, savingsAllocations] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.$queryRawUnsafe<Array<{ accountId: string; month: number; year: number; balance: any }>>(
      `SELECT "accountId", "month", "year", "balance" FROM "AccountMonthlyBalance" WHERE "userId" = $1`,
      userId
    ).catch(() => []),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { lte: endDate },
      },
      select: {
        id: true,
        accountId: true,
        toAccountId: true,
        type: true,
        transferTag: true,
        amount: true,
        date: true,
        description: true,
      },
      orderBy: { date: 'desc' },
    }),
    prisma.savingsAllocation.findMany({
      where: {
        userId,
        date: { lte: endDate },
      },
      select: {
        accountId: true,
        amount: true,
        date: true,
      },
    }),
  ]);

  const accountById = new Map(accounts.map((a) => [a.id, a]));

  // Group overrides per account sorted descending by year/month
  const overridesByAccount = new Map<string, Array<{ index: number; month: number; year: number; balance: number }>>();
  for (const row of monthlyOverrides) {
    const m = Number(row.month);
    const y = Number(row.year);
    const idx = y * 12 + (m - 1);
    if (idx > targetIndex) continue;
    const list = overridesByAccount.get(row.accountId) || [];
    list.push({ index: idx, month: m, year: y, balance: Number(row.balance || 0) });
    overridesByAccount.set(row.accountId, list);
  }
  overridesByAccount.forEach((list) => list.sort((a, b) => b.index - a.index));

  // Pre-aggregate earmarked savings up to endDate and savings contributed in target month
  const earmarkedByAccount = new Map<string, number>();
  let totalSavedThisMonth = 0;
  for (const alloc of savingsAllocations) {
    const amt = Number(alloc.amount || 0);
    earmarkedByAccount.set(alloc.accountId, (earmarkedByAccount.get(alloc.accountId) || 0) + amt);
    if (alloc.date >= startDate && alloc.date <= endDate && amt > 0) {
      totalSavedThisMonth += amt;
    }
  }

  // Track current month metrics per account
  const monthlyIncomeMap = new Map<string, number>();
  const monthlyExpenseMap = new Map<string, number>();
  const monthlyTransfersInMap = new Map<string, number>();
  const monthlyTransfersOutMap = new Map<string, number>();

  let totalReserveDraws = 0;
  const reserveDrawItems: MonthlyBalanceComputation['reserveDrawItems'] = [];

  for (const tx of transactionsUpToEnd) {
    if (tx.date < startDate || tx.date > endDate) continue;
    const amt = Number(tx.amount || 0);

    if (tx.type === 'INCOME') {
      monthlyIncomeMap.set(tx.accountId, (monthlyIncomeMap.get(tx.accountId) || 0) + amt);
    } else if (tx.type === 'EXPENSE') {
      monthlyExpenseMap.set(tx.accountId, (monthlyExpenseMap.get(tx.accountId) || 0) + amt);
    } else if (tx.type === 'TRANSFER') {
      monthlyTransfersOutMap.set(tx.accountId, (monthlyTransfersOutMap.get(tx.accountId) || 0) + amt);
      if (tx.toAccountId) {
        monthlyTransfersInMap.set(tx.toAccountId, (monthlyTransfersInMap.get(tx.toAccountId) || 0) + amt);
      }

      const fromAcc = accountById.get(tx.accountId);
      const toAcc = tx.toAccountId ? accountById.get(tx.toAccountId) : undefined;
      const isReserveToDaily =
        fromAcc?.role === 'RESERVE' && toAcc?.role === 'DAILY_SPENDING';

      if (tx.transferTag === 'RESERVE_DRAW' || isReserveToDaily) {
        totalReserveDraws += amt;
        reserveDrawItems.push({
          id: tx.id,
          amount: amt,
          date: tx.date,
          description: tx.description,
          transferTag: tx.transferTag,
          fromAccountName: fromAcc?.name || 'Reserve',
          toAccountName: toAcc?.name || 'Daily Wallet',
        });
      }
    }
  }

  const computedAccounts: ComputedMonthlyAccount[] = accounts.map((acc) => {
    const overrides = overridesByAccount.get(acc.id) || [];
    const exactOverride = overrides.find((o) => o.index === targetIndex);
    const priorOverride = overrides.find((o) => o.index < targetIndex);

    let startingBalance = 0;
    let isCarriedOver = false;

    if (exactOverride) {
      startingBalance = exactOverride.balance;
      isCarriedOver = false;
    } else {
      const anchorBalance = priorOverride ? priorOverride.balance : 0;
      const anchorStart = priorOverride
        ? new Date(priorOverride.year, priorOverride.month - 1, 1, 0, 0, 0, 0)
        : new Date(0);

      let priorNetDelta = 0;
      for (const tx of transactionsUpToEnd) {
        if (tx.date < anchorStart || tx.date >= startDate) continue;
        const amt = Number(tx.amount || 0);
        if (tx.type === 'INCOME' && tx.accountId === acc.id) {
          priorNetDelta += amt;
        } else if (tx.type === 'EXPENSE' && tx.accountId === acc.id) {
          priorNetDelta -= amt;
        } else if (tx.type === 'TRANSFER') {
          if (tx.accountId === acc.id) priorNetDelta -= amt;
          if (tx.toAccountId === acc.id) priorNetDelta += amt;
        }
      }

      startingBalance = anchorBalance + priorNetDelta;
      isCarriedOver = Boolean(priorOverride) || priorNetDelta !== 0;
    }

    const monthlyIncome = monthlyIncomeMap.get(acc.id) || 0;
    const monthlyExpense = monthlyExpenseMap.get(acc.id) || 0;
    const monthlyTransfersIn = monthlyTransfersInMap.get(acc.id) || 0;
    const monthlyTransfersOut = monthlyTransfersOutMap.get(acc.id) || 0;

    const balance =
      startingBalance + monthlyIncome - monthlyExpense + monthlyTransfersIn - monthlyTransfersOut;
    const earmarkedSavings = Math.max(0, earmarkedByAccount.get(acc.id) || 0);
    const availableBalance = balance - earmarkedSavings;

    return {
      id: acc.id,
      name: acc.name,
      type: acc.type as ComputedMonthlyAccount['type'],
      role: (acc.role || 'DAILY_SPENDING') as ComputedMonthlyAccount['role'],
      startingBalance,
      isCarriedOver,
      balance,
      earmarkedSavings,
      availableBalance,
      budgetLimit: acc.budgetLimit ? Number(acc.budgetLimit) : null,
      monthlyIncome,
      monthlyExpense,
      monthlyTransfersIn,
      monthlyTransfersOut,
      monthlyNet: monthlyIncome - monthlyExpense,
    };
  });

  return {
    accounts: computedAccounts,
    totalReserveDraws,
    reserveDrawItems,
    totalSavedThisMonth,
  };
}
