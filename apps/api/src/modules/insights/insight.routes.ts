import { Router, Response } from 'express';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticateJwt);

router.get('/month', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Parallelize all DB reads in a single roundtrip
    const [transactionTotals, accountTransactionTotals, incomePlans, budget, accounts, categoryExpenses, allCategories, monthlyBalances] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          date: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      }),
      prisma.transaction.groupBy({
        by: ['accountId', 'type'],
        where: {
          userId,
          date: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      }),
      prisma.incomePlan.findMany({
        where: { userId, month, year }
      }),
      prisma.budget.findUnique({
        where: {
          userId_month_year: { userId, month, year }
        },
        include: { items: true }
      }),
      prisma.account.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
          categoryId: { not: null }
        },
        _sum: { amount: true }
      }),
      prisma.category.findMany({
        where: { userId }
      }),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT "accountId", "balance"
        FROM "AccountMonthlyBalance"
        WHERE "userId" = $1 AND "month" = $2 AND "year" = $3
      `, userId, month, year).catch(() => [])
    ]);

    let actualIncome = 0;
    let actualExpense = 0;

    transactionTotals.forEach((group) => {
      const amount = Number(group._sum.amount || 0);
      if (group.type === 'INCOME') actualIncome = amount;
      if (group.type === 'EXPENSE') actualExpense = amount;
    });

    const accountIncomeMap = new Map<string, number>();
    const accountExpenseMap = new Map<string, number>();
    accountTransactionTotals.forEach((group) => {
      const amount = Number(group._sum.amount || 0);
      if (group.type === 'INCOME') accountIncomeMap.set(group.accountId, (accountIncomeMap.get(group.accountId) || 0) + amount);
      if (group.type === 'EXPENSE') accountExpenseMap.set(group.accountId, (accountExpenseMap.get(group.accountId) || 0) + amount);
    });

    const actualNet = actualIncome - actualExpense;
    const expectedIncome = incomePlans.reduce((sum, p) => sum + Number(p.expectedAmount), 0);
    const plannedExpense = budget ? budget.items.reduce((sum, item) => sum + Number(item.plannedAmount), 0) : 0;
    const expectedNet = expectedIncome - plannedExpense;

    const monthlyBalanceMap = new Map<string, number>();
    monthlyBalances.forEach((row) => {
      monthlyBalanceMap.set(row.accountId, Number(row.balance || 0));
    });

    const monthAccounts = accounts.map((acc) => {
      const startingBalance = monthlyBalanceMap.has(acc.id) ? (monthlyBalanceMap.get(acc.id) || 0) : 0;
      const accIncome = accountIncomeMap.get(acc.id) || 0;
      const accExpense = accountExpenseMap.get(acc.id) || 0;
      const balance = startingBalance + accIncome - accExpense;
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        startingBalance,
        balance,
        budgetLimit: acc.budgetLimit ? Number(acc.budgetLimit) : null
      };
    });

    const totalWalletBalance = monthAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // 5. Category Breakdown for Charts
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    const chartData = categoryExpenses.map((ce) => {
      const cat = categoryMap.get(ce.categoryId!);
      return {
        categoryId: ce.categoryId,
        categoryName: cat?.name || 'Uncategorized',
        color: cat?.color || '#94A3B8',
        amount: Number(ce._sum.amount || 0)
      };
    }).sort((a, b) => b.amount - a.amount);

    res.json({
      month,
      year,
      actualInsight: {
        totalIncome: actualIncome,
        totalExpense: actualExpense,
        net: actualNet
      },
      expectedInsight: {
        totalIncome: expectedIncome,
        totalExpense: plannedExpense,
        net: expectedNet
      },
      totalWalletBalance,
      accounts: monthAccounts,
      categoryBreakdown: chartData
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to generate insights', error: error.message });
  }
});

export default router;
