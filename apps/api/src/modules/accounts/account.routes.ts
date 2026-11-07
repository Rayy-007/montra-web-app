import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticateJwt);

const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CASH', 'MOBILE_WALLET', 'BANK', 'SAVINGS']),
  balance: z.number().default(0),
  budgetLimit: z.number().optional().nullable()
});

// GET all accounts
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch accounts', error: error.message });
  }
});

// GET accounts with monthly transaction summaries
router.get('/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch accounts, aggregated transaction totals, and month-specific balances in parallel
    const [accounts, transactionTotals, monthlyBalances] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.transaction.groupBy({
        by: ['accountId', 'type'],
        where: {
          userId,
          date: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      }),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT "accountId", "balance"
        FROM "AccountMonthlyBalance"
        WHERE "userId" = $1 AND "month" = $2 AND "year" = $3
      `, userId, month, year).catch(() => [])
    ]);

    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    transactionTotals.forEach((group) => {
      const amount = Number(group._sum.amount || 0);
      if (group.type === 'INCOME') {
        incomeMap.set(group.accountId, (incomeMap.get(group.accountId) || 0) + amount);
      } else if (group.type === 'EXPENSE') {
        expenseMap.set(group.accountId, (expenseMap.get(group.accountId) || 0) + amount);
      }
    });

    const monthlyBalanceMap = new Map<string, number>();
    monthlyBalances.forEach((row) => {
      monthlyBalanceMap.set(row.accountId, Number(row.balance || 0));
    });

    const accountSummaries = accounts.map((account) => {
      const monthlyIncome = incomeMap.get(account.id) || 0;
      const monthlyExpense = expenseMap.get(account.id) || 0;

      // Respective month's balance:
      // If balance exists for this month, use it as starting balance. For uncreated / future months, reset to 0.
      const startingBalance = monthlyBalanceMap.has(account.id)
        ? (monthlyBalanceMap.get(account.id) || 0)
        : 0;

      // Overall balance reducing based on expense and increasing based on income:
      const balance = startingBalance + monthlyIncome - monthlyExpense;

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        startingBalance,
        balance,
        budgetLimit: account.budgetLimit ? Number(account.budgetLimit) : null,
        monthlyIncome,
        monthlyExpense,
        monthlyNet: monthlyIncome - monthlyExpense,
      };
    });

    res.json(accountSummaries);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch monthly account data', error: error.message });
  }
});

// POST new account
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const month = parseInt(String(req.body.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.body.year || new Date().getFullYear()), 10);

    const account = await prisma.account.create({
      data: {
        userId,
        name: parsed.data.name,
        type: parsed.data.type,
        balance: parsed.data.balance,
        budgetLimit: parsed.data.budgetLimit
      }
    });

    // Record initial balance for the current active month
    if (parsed.data.balance > 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "AccountMonthlyBalance" ("id", "userId", "accountId", "month", "year", "balance", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
        ON CONFLICT ("accountId", "month", "year") DO UPDATE
        SET "balance" = EXCLUDED."balance", "updatedAt" = NOW()
      `, userId, account.id, month, year, parsed.data.balance).catch(() => {});
    }

    res.status(201).json(account);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create account', error: error.message });
  }
});

// PUT update account
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const parsed = accountSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const updated = await prisma.account.updateMany({
      where: { id, userId },
      data: parsed.data
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Update month-specific balance if balance is provided
    if (parsed.data.balance !== undefined) {
      const month = parseInt(String(req.body.month || req.query.month || new Date().getMonth() + 1), 10);
      const year = parseInt(String(req.body.year || req.query.year || new Date().getFullYear()), 10);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "AccountMonthlyBalance" ("id", "userId", "accountId", "month", "year", "balance", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
        ON CONFLICT ("accountId", "month", "year") DO UPDATE
        SET "balance" = EXCLUDED."balance", "updatedAt" = NOW()
      `, userId, id, month, year, parsed.data.balance).catch((err) => {
        console.error('Failed to update monthly balance:', err);
      });
    }

    const account = await prisma.account.findUnique({ where: { id } });
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update account', error: error.message });
  }
});

// DELETE account
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const account = await prisma.account.findFirst({
      where: { id, userId }
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Clean up monthly balances and transactions for this account first
    await prisma.$executeRawUnsafe(`
      DELETE FROM "AccountMonthlyBalance" WHERE "accountId" = $1
    `, id).catch(() => {});

    await prisma.transaction.deleteMany({
      where: { accountId: id, userId }
    });

    await prisma.account.delete({
      where: { id }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
});

// POST reset all account balances to 0 for a specific month (keeps old history for other months!)
router.post('/reset', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = parseInt(String(req.query.month || req.body.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || req.body.year || new Date().getFullYear()), 10);

    const accounts = await prisma.account.findMany({ where: { userId } });
    for (const acc of accounts) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "AccountMonthlyBalance" ("id", "userId", "accountId", "month", "year", "balance", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, NOW())
        ON CONFLICT ("accountId", "month", "year") DO UPDATE
        SET "balance" = 0, "updatedAt" = NOW()
      `, userId, acc.id, month, year).catch(() => {});
    }

    res.json({ message: `All wallet balances for ${month}/${year} reset to 0` });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to reset account balances', error: error.message });
  }
});

// POST reset single account balance to 0 for a specific month
router.post('/:id/reset', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const month = parseInt(String(req.query.month || req.body.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || req.body.year || new Date().getFullYear()), 10);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "AccountMonthlyBalance" ("id", "userId", "accountId", "month", "year", "balance", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, NOW())
      ON CONFLICT ("accountId", "month", "year") DO UPDATE
      SET "balance" = 0, "updatedAt" = NOW()
    `, userId, id, month, year);

    res.json({ message: `Account balance for ${month}/${year} reset to 0` });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to reset account balance', error: error.message });
  }
});

export default router;
