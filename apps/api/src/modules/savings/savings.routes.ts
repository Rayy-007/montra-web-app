import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticateJwt);

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

const allocateSchema = z.object({
  goalId: z.string().uuid(),
  mode: z.enum(['EARMARK', 'TRANSFER_AND_SAVE']).default('EARMARK'),
  fromAccountId: z.string().uuid().optional().nullable(),
  toAccountId: z.string().uuid(), // Wallet where the savings money sits (e.g., AYA Bank or Cash)
  amount: z.number().refine((n) => n !== 0, 'Amount must be non-zero'),
  note: z.string().optional().nullable(),
  date: z.string().optional(),
});

// GET all savings goals with wallet breakdown & allocation history
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = req.query.month ? parseInt(String(req.query.month), 10) : null;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : null;

    const [goals, allocations, accounts] = await Promise.all([
      prisma.savingsGoal.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.savingsAllocation.findMany({
        where: { userId },
        include: {
          account: { select: { id: true, name: true, type: true, role: true } },
          goal: { select: { id: true, name: true, color: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.account.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const startDate = month && year ? new Date(year, month - 1, 1, 0, 0, 0, 0) : null;
    const endDate = month && year ? new Date(year, month, 0, 23, 59, 59, 999) : null;

    let totalSavedAllGoals = 0;
    let totalTargetAllGoals = 0;
    let savedSelectedMonth = 0;

    const formattedGoals = goals.map((goal) => {
      const goalAllocs = allocations.filter((a) => a.goalId === goal.id);
      let totalSaved = 0;
      let monthContribution = 0;
      const walletMap = new Map<string, { accountId: string; accountName: string; accountType: string; amount: number }>();

      for (const a of goalAllocs) {
        const amt = Number(a.amount || 0);
        totalSaved += amt;

        if (startDate && endDate && a.date >= startDate && a.date <= endDate) {
          monthContribution += amt;
        }

        const existing = walletMap.get(a.accountId) || {
          accountId: a.accountId,
          accountName: a.account.name,
          accountType: a.account.type,
          amount: 0,
        };
        existing.amount += amt;
        walletMap.set(a.accountId, existing);
      }

      const walletBreakdown = Array.from(walletMap.values()).filter((w) => w.amount > 0);
      const target = goal.targetAmount ? Number(goal.targetAmount) : null;
      const progressPercent = target && target > 0 ? Math.min(Math.round((totalSaved / target) * 100), 100) : null;

      totalSavedAllGoals += Math.max(0, totalSaved);
      if (target) totalTargetAllGoals += target;
      if (monthContribution > 0) savedSelectedMonth += monthContribution;

      return {
        id: goal.id,
        name: goal.name,
        targetAmount: target,
        icon: goal.icon || 'PiggyBank',
        color: goal.color || '#10B981',
        totalSaved,
        monthContribution,
        progressPercent,
        walletBreakdown,
        recentAllocations: goalAllocs.slice(0, 8).map((a) => ({
          id: a.id,
          amount: Number(a.amount),
          note: a.note,
          date: a.date,
          accountId: a.accountId,
          accountName: a.account.name,
        })),
        createdAt: goal.createdAt,
      };
    });

    // Wallet-level summary showing how much of each holding wallet is split across goals
    const walletSummaryMap = new Map<string, { accountId: string; accountName: string; accountType: string; totalEarmarked: number; goals: Array<{ goalName: string; amount: number; color: string }> }>();
    for (const goal of formattedGoals) {
      for (const wb of goal.walletBreakdown) {
        const entry = walletSummaryMap.get(wb.accountId) || {
          accountId: wb.accountId,
          accountName: wb.accountName,
          accountType: wb.accountType,
          totalEarmarked: 0,
          goals: [],
        };
        entry.totalEarmarked += wb.amount;
        entry.goals.push({ goalName: goal.name, amount: wb.amount, color: goal.color });
        walletSummaryMap.set(wb.accountId, entry);
      }
    }

    res.json({
      summary: {
        totalSavedAllGoals,
        totalTargetAllGoals,
        savedSelectedMonth,
        goalCount: formattedGoals.length,
      },
      goals: formattedGoals,
      walletHoldings: Array.from(walletSummaryMap.values()),
      recentAllocations: allocations.slice(0, 20).map((a) => ({
        id: a.id,
        goalId: a.goalId,
        goalName: a.goal.name,
        goalColor: a.goal.color || '#10B981',
        accountId: a.accountId,
        accountName: a.account.name,
        amount: Number(a.amount),
        note: a.note,
        date: a.date,
      })),
      accounts: accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        role: acc.role,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to load savings goals', error: error.message });
  }
});

// POST create a savings goal
router.post('/goals', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = goalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        name: parsed.data.name.trim(),
        targetAmount: parsed.data.targetAmount ?? null,
        icon: parsed.data.icon || 'PiggyBank',
        color: parsed.data.color || '#10B981',
      },
    });

    res.status(201).json(goal);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create savings goal', error: error.message });
  }
});

// PUT update a savings goal
router.put('/goals/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const parsed = goalSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const updated = await prisma.savingsGoal.updateMany({
      where: { id, userId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.targetAmount !== undefined ? { targetAmount: parsed.data.targetAmount } : {}),
        ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: 'Savings goal not found' });
    }

    const goal = await prisma.savingsGoal.findUnique({ where: { id } });
    res.json(goal);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update savings goal', error: error.message });
  }
});

// DELETE a savings goal (only removes the goal & earmark labels, never deletes wallet money)
router.delete('/goals/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await prisma.savingsGoal.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: 'Savings goal not found' });
    }

    res.json({ message: 'Savings goal deleted cleanly (wallet balances unchanged)' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete savings goal', error: error.message });
  }
});

// POST fund or withdraw from a savings goal (supports Earmark or Transfer & Save)
router.post('/allocate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = allocateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { goalId, mode, fromAccountId, toAccountId, amount, note, date } = parsed.data;
    const txDate = date ? new Date(date) : new Date();

    const [goal, toAccount] = await Promise.all([
      prisma.savingsGoal.findFirst({ where: { id: goalId, userId } }),
      prisma.account.findFirst({ where: { id: toAccountId, userId } }),
    ]);

    if (!goal) return res.status(404).json({ message: 'Savings goal not found' });
    if (!toAccount) return res.status(404).json({ message: 'Holding wallet not found' });

    if (mode === 'TRANSFER_AND_SAVE') {
      if (amount <= 0) {
        return res.status(400).json({ message: 'Transfer & Save requires a positive amount' });
      }
      if (!fromAccountId || fromAccountId === toAccountId) {
        return res.status(400).json({ message: 'Please select a different source wallet to transfer from' });
      }
      const fromAccount = await prisma.account.findFirst({ where: { id: fromAccountId, userId } });
      if (!fromAccount) return res.status(404).json({ message: 'Source wallet not found' });

      const result = await prisma.$transaction(async (tx) => {
        const transferTx = await tx.transaction.create({
          data: {
            userId,
            accountId: fromAccountId,
            toAccountId,
            type: 'TRANSFER',
            transferTag: 'SAVINGS_CONTRIBUTION',
            amount,
            date: txDate,
            description: note ? `Saved for ${goal.name}: ${note}` : `Saved for ${goal.name}`,
          },
        });

        await tx.account.update({
          where: { id: fromAccountId },
          data: { balance: { decrement: amount } },
        });
        await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: amount } },
        });

        const allocation = await tx.savingsAllocation.create({
          data: {
            userId,
            goalId,
            accountId: toAccountId,
            amount,
            note: note || `Transferred from ${fromAccount.name}`,
            date: txDate,
          },
        });

        return { allocation, transferTx };
      });

      return res.status(201).json(result);
    }

    // EARMARK mode: assigns existing balance inside `toAccountId` to `goalId` (or releases via negative amount)
    const allocation = await prisma.savingsAllocation.create({
      data: {
        userId,
        goalId,
        accountId: toAccountId,
        amount,
        note: note || (amount > 0 ? `Earmarked inside ${toAccount.name}` : `Released from ${goal.name}`),
        date: txDate,
      },
    });

    res.status(201).json({ allocation });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to save allocation', error: error.message });
  }
});

// DELETE a single allocation entry
router.delete('/allocations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await prisma.savingsAllocation.deleteMany({
      where: { id, userId },
    });
    if (deleted.count === 0) {
      return res.status(404).json({ message: 'Allocation entry not found' });
    }

    res.json({ message: 'Allocation entry deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete allocation entry', error: error.message });
  }
});

export default router;
