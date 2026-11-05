import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticateJwt);

const incomePlanSchema = z.object({
  source: z.string().min(1),
  expectedAmount: z.number().nonnegative(),
  expectedDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  description: z.string().optional().nullable()
});

const receiveIncomeSchema = z.object({
  accountId: z.string().uuid(),
  actualAmount: z.number().positive(),
  actualDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional()
});

// GET income plans for month
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

    const plans = await prisma.incomePlan.findMany({
      where: { userId, month, year },
      orderBy: { createdAt: 'asc' }
    });

    let totalExpected = 0;
    let totalActual = 0;

    const formattedPlans = plans.map((p) => {
      const exp = Number(p.expectedAmount);
      const act = Number(p.actualAmount);
      totalExpected += exp;
      totalActual += act;

      return {
        ...p,
        expectedAmount: exp,
        actualAmount: act,
        diff: act - exp
      };
    });

    res.json({
      month,
      year,
      summary: {
        totalExpected,
        totalActual,
        totalDiff: totalActual - totalExpected
      },
      items: formattedPlans
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch income plans', error: error.message });
  }
});

// POST new expected income
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = incomePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const plan = await prisma.incomePlan.create({
      data: {
        userId,
        source: parsed.data.source,
        expectedAmount: parsed.data.expectedAmount,
        expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : null,
        month: parsed.data.month,
        year: parsed.data.year,
        description: parsed.data.description || null,
        status: 'EXPECTED'
      }
    });

    res.status(201).json(plan);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create income plan', error: error.message });
  }
});

// POST receive income into account
router.post('/:id/receive', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const parsed = receiveIncomeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { accountId, actualAmount, actualDate } = parsed.data;

    const plan = await prisma.incomePlan.findFirst({
      where: { id, userId }
    });
    if (!plan) {
      return res.status(404).json({ message: 'Income plan not found' });
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId }
    });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const date = actualDate ? new Date(actualDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create income transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId,
          type: 'INCOME',
          amount: actualAmount,
          date,
          description: `Income: ${plan.source}`,
          incomePlanId: plan.id
        }
      });

      // 2. Increment wallet balance
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: actualAmount }
        }
      });

      // 3. Update income plan status and actual amount
      const newTotalActual = Number(plan.actualAmount) + actualAmount;
      const expected = Number(plan.expectedAmount);
      let status: 'EXPECTED' | 'RECEIVED' | 'PARTIAL' = 'PARTIAL';
      if (newTotalActual >= expected) {
        status = 'RECEIVED';
      }

      const updatedPlan = await tx.incomePlan.update({
        where: { id },
        data: {
          actualAmount: newTotalActual,
          actualDate: date,
          status
        }
      });

      return { transaction, plan: updatedPlan };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to record received income', error: error.message });
  }
});

// PUT update income plan
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const parsed = incomePlanSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const updated = await prisma.incomePlan.updateMany({
      where: { id, userId },
      data: {
        ...(parsed.data.source && { source: parsed.data.source }),
        ...(parsed.data.expectedAmount !== undefined && { expectedAmount: parsed.data.expectedAmount }),
        ...(parsed.data.expectedDate !== undefined && { expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : null }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      }
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: 'Income plan not found' });
    }

    const plan = await prisma.incomePlan.findUnique({ where: { id } });
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update income plan', error: error.message });
  }
});

// DELETE income plan
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await prisma.incomePlan.deleteMany({
      where: { id, userId }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: 'Income plan not found' });
    }

    res.json({ message: 'Income plan deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete income plan', error: error.message });
  }
});

export default router;
