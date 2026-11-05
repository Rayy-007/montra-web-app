import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticateJwt);

const transactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']),
  amount: z.number().positive(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  description: z.string().optional().nullable(),
  incomePlanId: z.string().uuid().optional().nullable()
});

// GET transactions with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { month, year, accountId, categoryId, type } = req.query;

    const where: any = { userId };

    if (accountId) {
      where.accountId = String(accountId);
    }
    if (categoryId) {
      where.categoryId = String(categoryId);
    }
    if (type && (type === 'EXPENSE' || type === 'INCOME' || type === 'TRANSFER')) {
      where.type = type;
    }

    if (month && year) {
      const m = parseInt(String(month), 10);
      const y = parseInt(String(year), 10);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true, icon: true, color: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
});

// POST transaction (updates account balance atomically)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { accountId, categoryId, type, amount, date, description, incomePlanId } = parsed.data;

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId }
    });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId,
          categoryId: categoryId || null,
          type,
          amount,
          date: new Date(date),
          description: description || null,
          incomePlanId: incomePlanId || null
        },
        include: {
          account: true,
          category: true
        }
      });

      // Update account balance
      const balanceChange = type === 'INCOME' ? amount : -amount;
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: balanceChange }
        }
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create transaction', error: error.message });
  }
});

// DELETE transaction (reverts account balance atomically)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId }
    });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Revert balance change
      const amount = Number(transaction.amount);
      const balanceChange = transaction.type === 'INCOME' ? -amount : amount;

      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: { increment: balanceChange }
        }
      });

      await tx.transaction.delete({
        where: { id }
      });
    });

    res.json({ message: 'Transaction deleted and account balance updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete transaction', error: error.message });
  }
});

export default router;
