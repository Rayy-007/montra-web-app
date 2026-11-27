import { Router, Response } from 'express';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';
import { computeMonthlyAccountsAndCoachMetrics } from '../../lib/monthlyBalances';

const router = Router();
router.use(authenticateJwt);

const getMonthlyInsights = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const [
      transactionTotals,
      incomePlans,
      budget,
      categoryExpenses,
      allCategories,
      monthlyComputation,
    ] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
          type: { in: ['INCOME', 'EXPENSE'] }, // Strictly exclude TRANSFER from Income/Expense totals
        },
        _sum: { amount: true },
      }),
      prisma.incomePlan.findMany({
        where: { userId, month, year },
      }),
      prisma.budget.findUnique({
        where: {
          userId_month_year: { userId, month, year },
        },
        include: { items: true },
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
          categoryId: { not: null },
        },
        _sum: { amount: true },
      }),
      prisma.category.findMany({
        where: { userId },
      }),
      computeMonthlyAccountsAndCoachMetrics(userId, month, year),
    ]);

    let actualIncome = 0;
    let actualExpense = 0;

    transactionTotals.forEach((group) => {
      const amount = Number(group._sum.amount || 0);
      if (group.type === 'INCOME') actualIncome = amount;
      if (group.type === 'EXPENSE') actualExpense = amount;
    });

    const actualNet = actualIncome - actualExpense;
    const expectedIncome = incomePlans.reduce((sum, p) => sum + Number(p.expectedAmount), 0);
    const plannedExpense = budget ? budget.items.reduce((sum, item) => sum + Number(item.plannedAmount), 0) : 0;
    const expectedNet = expectedIncome - plannedExpense;

    const monthAccounts = monthlyComputation.accounts;
    const totalWalletBalance = monthAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // Coach Metrics: Separate Daily Spending vs. Reserve vs. Savings & track Reserve Draws
    const dailySpendingBalance = monthAccounts
      .filter((a) => a.role === 'DAILY_SPENDING')
      .reduce((sum, a) => sum + a.availableBalance, 0);
    const reserveBalance = monthAccounts
      .filter((a) => a.role === 'RESERVE')
      .reduce((sum, a) => sum + a.availableBalance, 0);
    const totalEarmarkedSavings = monthAccounts.reduce((sum, a) => sum + a.earmarkedSavings, 0);
    const budgetOverrun = plannedExpense > 0 ? Math.max(0, actualExpense - plannedExpense) : 0;

    // Category Breakdown for Charts
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    const chartData = categoryExpenses
      .map((ce) => {
        const cat = categoryMap.get(ce.categoryId!);
        return {
          categoryId: ce.categoryId,
          categoryName: cat?.name || 'Uncategorized',
          color: cat?.color || '#94A3B8',
          icon: cat?.icon || null,
          amount: Number(ce._sum.amount || 0),
        };
      })
      .sort((a, b) => b.amount - a.amount);

    res.json({
      month,
      year,
      actualInsight: {
        totalIncome: actualIncome,
        totalExpense: actualExpense,
        net: actualNet,
      },
      expectedInsight: {
        totalIncome: expectedIncome,
        totalExpense: plannedExpense,
        net: expectedNet,
      },
      totalWalletBalance,
      accounts: monthAccounts,
      categoryBreakdown: chartData,
      coachMetrics: {
        dailySpendingBalance,
        reserveBalance,
        totalEarmarkedSavings,
        totalReserveDraws: monthlyComputation.totalReserveDraws,
        reserveDrawItems: monthlyComputation.reserveDrawItems,
        totalBudgetPlanned: plannedExpense,
        budgetOverrun,
        totalSavedThisMonth: monthlyComputation.totalSavedThisMonth,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to generate insights', error: error.message });
  }
};

const MONTH_SHORT_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Aggregates expense transactions into sorted category and wallet usage breakdowns.
 */
function buildExpenseBreakdowns(
  expenses: Array<{
    amount: any;
    categoryId: string | null;
    accountId: string;
    category: { id: string; name: string; color: string | null; icon: string | null } | null;
    account: { id: string; name: string; type: string; color: string | null; icon: string | null } | null;
  }>,
  totalExpense: number,
  plannedByCat?: Map<string, number>,
  allCategories?: Array<{ id: string; name: string; color: string | null; icon: string | null }>
) {
  const catTotals = new Map<
    string,
    { categoryId: string; categoryName: string; color: string; icon: string | null; amount: number }
  >();
  const walletTotals = new Map<
    string,
    { accountId: string; name: string; type: string; color: string | null; icon: string | null; expenseTotal: number; txCount: number }
  >();

  for (const tx of expenses) {
    const amt = Number(tx.amount || 0);
    const catKey = tx.categoryId || 'uncategorized';
    const existingCat = catTotals.get(catKey) || {
      categoryId: catKey,
      categoryName: tx.category?.name || 'Uncategorized',
      color: tx.category?.color || '#94A3B8',
      icon: tx.category?.icon || null,
      amount: 0,
    };
    existingCat.amount += amt;
    catTotals.set(catKey, existingCat);

    if (tx.account) {
      const existingWallet = walletTotals.get(tx.accountId) || {
        accountId: tx.accountId,
        name: tx.account.name,
        type: tx.account.type,
        color: tx.account.color || null,
        icon: tx.account.icon || null,
        expenseTotal: 0,
        txCount: 0,
      };
      existingWallet.expenseTotal += amt;
      existingWallet.txCount += 1;
      walletTotals.set(tx.accountId, existingWallet);
    }
  }

  // Ensure categories with planned budget > 0 appear in Budget vs Actual comparisons even if 0 spent
  if (plannedByCat && allCategories) {
    for (const cat of allCategories) {
      const planned = plannedByCat.get(cat.id) || 0;
      if (planned > 0 && !catTotals.has(cat.id)) {
        catTotals.set(cat.id, {
          categoryId: cat.id,
          categoryName: cat.name,
          color: cat.color || '#94A3B8',
          icon: cat.icon || null,
          amount: 0,
        });
      }
    }
  }

  const categoryBreakdown = Array.from(catTotals.values())
    .map((c) => {
      const plannedAmount = plannedByCat?.get(c.categoryId) || 0;
      return {
        ...c,
        plannedAmount,
        percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0,
        isOverBudget: plannedAmount > 0 && c.amount > plannedAmount,
      };
    })
    .sort((a, b) => b.amount - a.amount || b.plannedAmount - a.plannedAmount);

  const walletUsage = Array.from(walletTotals.values())
    .map((w) => ({
      ...w,
      percentage: totalExpense > 0 ? Math.round((w.expenseTotal / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.expenseTotal - a.expenseTotal);

  return { categoryBreakdown, walletUsage };
}

/**
 * GET /api/insights/stats/month?month=M&year=Y
 * Returns detailed daily rhythm, category share, budget vs actual, and wallet usage for a month.
 */
router.get('/stats/month', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    const [transactions, budget, allCategories, savingsAllocs] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          account: { select: { id: true, name: true, type: true, color: true, icon: true } },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.budget.findUnique({
        where: { userId_month_year: { userId, month, year } },
        include: { items: true },
      }),
      prisma.category.findMany({
        where: { userId, type: 'EXPENSE' },
        select: { id: true, name: true, color: true, icon: true },
      }),
      prisma.savingsAllocation.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        select: { amount: true },
      }),
    ]);

    const dailySeries = Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1;
      return {
        day,
        label: String(day),
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        income: 0,
        expense: 0,
        txCount: 0,
      };
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let totalReserveDraws = 0;
    const expenseTransactions: typeof transactions = [];

    for (const tx of transactions) {
      const amt = Number(tx.amount || 0);
      const dayIdx = new Date(tx.date).getDate() - 1;
      if (tx.type === 'INCOME') {
        totalIncome += amt;
        if (dailySeries[dayIdx]) dailySeries[dayIdx].income += amt;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += amt;
        expenseTransactions.push(tx);
        if (dailySeries[dayIdx]) {
          dailySeries[dayIdx].expense += amt;
          dailySeries[dayIdx].txCount += 1;
        }
      } else if (tx.type === 'TRANSFER' && tx.transferTag === 'RESERVE_DRAW') {
        totalReserveDraws += amt;
      }
    }

    const totalSaved = savingsAllocs.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const plannedByCat = new Map<string, number>();
    let totalPlannedBudget = 0;
    for (const item of budget?.items || []) {
      const p = Number(item.plannedAmount || 0);
      plannedByCat.set(item.categoryId, p);
      totalPlannedBudget += p;
    }

    const { categoryBreakdown, walletUsage } = buildExpenseBreakdowns(
      expenseTransactions,
      totalExpense,
      plannedByCat,
      allCategories
    );

    const activeDays = dailySeries.filter((d) => d.expense > 0);
    const highestDay = activeDays.reduce<(typeof dailySeries)[number] | null>(
      (max, d) => (!max || d.expense > max.expense ? d : max),
      null
    );

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
    const elapsedDays = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;

    res.json({
      month,
      year,
      summary: {
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        totalPlannedBudget,
        totalSaved: Math.max(0, totalSaved),
        totalReserveDraws,
        savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
        avgDailySpend: Math.round(totalExpense / elapsedDays),
        activeDaysCount: activeDays.length,
        highestSpendDay: highestDay
          ? { day: highestDay.day, date: highestDay.date, amount: highestDay.expense }
          : null,
      },
      dailySeries,
      categoryBreakdown,
      walletUsage,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to generate monthly stats', error: error.message });
  }
});

/**
 * GET /api/insights/stats/year?year=Y
 * Returns 12-month cashflow, savings, annual category share, and wallet usage for a full year.
 */
router.get('/stats/year', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

    const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const [transactions, budgets, savingsAllocs] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          account: { select: { id: true, name: true, type: true, color: true, icon: true } },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.budget.findMany({
        where: { userId, year },
        include: { items: true },
      }),
      prisma.savingsAllocation.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        select: { amount: true, date: true },
      }),
    ]);

    const monthlySeries = MONTH_SHORT_LABELS.map((label, idx) => ({
      month: idx + 1,
      label,
      income: 0,
      expense: 0,
      net: 0,
      saved: 0,
      reserveDraws: 0,
      plannedBudget: 0,
    }));

    for (const b of budgets) {
      const mIdx = b.month - 1;
      if (monthlySeries[mIdx]) {
        monthlySeries[mIdx].plannedBudget = b.items.reduce(
          (sum, item) => sum + Number(item.plannedAmount || 0),
          0
        );
      }
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let totalReserveDraws = 0;
    const expenseTransactions: typeof transactions = [];

    for (const tx of transactions) {
      const amt = Number(tx.amount || 0);
      const mIdx = new Date(tx.date).getMonth();
      const row = monthlySeries[mIdx];
      if (!row) continue;

      if (tx.type === 'INCOME') {
        totalIncome += amt;
        row.income += amt;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += amt;
        row.expense += amt;
        expenseTransactions.push(tx);
      } else if (tx.type === 'TRANSFER' && tx.transferTag === 'RESERVE_DRAW') {
        totalReserveDraws += amt;
        row.reserveDraws += amt;
      }
    }

    let totalSaved = 0;
    for (const s of savingsAllocs) {
      const amt = Number(s.amount || 0);
      const mIdx = new Date(s.date).getMonth();
      if (monthlySeries[mIdx]) {
        monthlySeries[mIdx].saved += amt;
      }
      totalSaved += amt;
    }

    for (const row of monthlySeries) {
      row.net = row.income - row.expense;
    }

    const { categoryBreakdown, walletUsage } = buildExpenseBreakdowns(expenseTransactions, totalExpense);

    const activeSpendMonths = monthlySeries.filter((m) => m.expense > 0);
    const highestSpendMonth = activeSpendMonths.reduce<(typeof monthlySeries)[number] | null>(
      (max, m) => (!max || m.expense > max.expense ? m : max),
      null
    );
    const highestIncomeMonth = monthlySeries
      .filter((m) => m.income > 0)
      .reduce<(typeof monthlySeries)[number] | null>(
        (max, m) => (!max || m.income > max.income ? m : max),
        null
      );

    res.json({
      year,
      summary: {
        year,
        totalIncome,
        totalExpense,
        netCashflow: totalIncome - totalExpense,
        totalSaved: Math.max(0, totalSaved),
        totalReserveDraws,
        savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
        avgMonthlyExpense:
          activeSpendMonths.length > 0 ? Math.round(totalExpense / activeSpendMonths.length) : 0,
        activeMonthsCount: activeSpendMonths.length,
        highestSpendMonth: highestSpendMonth
          ? { month: highestSpendMonth.month, label: highestSpendMonth.label, amount: highestSpendMonth.expense }
          : null,
        highestIncomeMonth: highestIncomeMonth
          ? { month: highestIncomeMonth.month, label: highestIncomeMonth.label, amount: highestIncomeMonth.income }
          : null,
      },
      monthlySeries,
      categoryBreakdown,
      walletUsage,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to generate yearly stats', error: error.message });
  }
});

router.get('/month', getMonthlyInsights);
router.get('/', getMonthlyInsights);

export default router;
