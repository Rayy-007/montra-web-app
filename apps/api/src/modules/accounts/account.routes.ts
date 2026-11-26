import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';
import { computeMonthlyAccountsAndCoachMetrics } from '../../lib/monthlyBalances';

const router = Router();
router.use(authenticateJwt);

const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CASH', 'MOBILE_WALLET', 'BANK', 'SAVINGS']),
  role: z.enum(['DAILY_SPENDING', 'RESERVE', 'SAVINGS_HOLDING']).optional(),
  balance: z.number().default(0),
  budgetLimit: z.number().optional().nullable(),
});

function inferDefaultRole(type: 'CASH' | 'MOBILE_WALLET' | 'BANK' | 'SAVINGS') {
  if (type === 'BANK') return 'RESERVE';
  if (type === 'SAVINGS') return 'SAVINGS_HOLDING';
  return 'DAILY_SPENDING';
}

// GET all accounts
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch accounts', error: error.message });
  }
});

// GET accounts with monthly transaction summaries (supports auto-carryover & transfers)
router.get('/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

    const { accounts } = await computeMonthlyAccountsAndCoachMetrics(userId, month, year);
    res.json(accounts);
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
    const role = parsed.data.role || inferDefaultRole(parsed.data.type);

    const account = await prisma.account.create({
      data: {
        userId,
        name: parsed.data.name,
        type: parsed.data.type,
        role,
        balance: parsed.data.balance,
        budgetLimit: parsed.data.budgetLimit,
      },
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
      data: parsed.data,
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Update month-specific balance if balance is provided (acts as explicit override for that month)
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
      where: { id, userId },
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Clean up monthly balances and transactions for this account first
    await prisma.$executeRawUnsafe(`
      DELETE FROM "AccountMonthlyBalance" WHERE "accountId" = $1
    `, id).catch(() => {});

    await prisma.transaction.deleteMany({
      where: { OR: [{ accountId: id }, { toAccountId: id }], userId },
    });

    await prisma.account.delete({
      where: { id },
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
});

// POST reset all account balances to 0 for a specific month
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
