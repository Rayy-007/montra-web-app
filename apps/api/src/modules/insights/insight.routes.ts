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

router.get('/month', getMonthlyInsights);
router.get('/', getMonthlyInsights);

export default router;
