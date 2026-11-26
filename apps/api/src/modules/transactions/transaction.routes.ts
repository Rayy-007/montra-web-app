import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticateJwt);

const transactionSchema = z.object({
  accountId: z.string().uuid(),
  toAccountId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']),
  transferTag: z.string().optional().nullable(),
  amount: z.number().positive(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  description: z.string().optional().nullable(),
  incomePlanId: z.string().uuid().optional().nullable(),
});

// GET transactions with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { month, year, accountId, categoryId, type } = req.query;

    const where: any = { userId };

    if (accountId) {
      where.OR = [{ accountId: String(accountId) }, { toAccountId: String(accountId) }];
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
        account: { select: { id: true, name: true, type: true, role: true, color: true, icon: true } },
        toAccount: { select: { id: true, name: true, type: true, role: true, color: true, icon: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
});

// POST transaction (supports EXPENSE, INCOME, and two-wallet TRANSFER)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { accountId, toAccountId, categoryId, type, transferTag, amount, date, description, incomePlanId } = parsed.data;

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      return res.status(404).json({ message: 'Source account not found' });
    }

    if (type === 'TRANSFER') {
      if (!toAccountId || toAccountId === accountId) {
        return res.status(400).json({ message: 'Transfers require a different destination wallet' });
      }
      const destAccount = await prisma.account.findFirst({
        where: { id: toAccountId, userId },
      });
      if (!destAccount) {
        return res.status(404).json({ message: 'Destination account not found' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId,
          toAccountId: type === 'TRANSFER' ? toAccountId || null : null,
          categoryId: type === 'TRANSFER' ? null : categoryId || null,
          type,
          transferTag: type === 'TRANSFER' ? transferTag || 'OTHER' : null,
          amount,
          date: new Date(date),
          description: description || null,
          incomePlanId: incomePlanId || null,
        },
        include: {
          account: true,
          toAccount: true,
          category: true,
        },
      });

      if (type === 'TRANSFER' && toAccountId) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: amount } },
        });
        await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: amount } },
        });
      } else {
        const balanceChange = type === 'INCOME' ? amount : -amount;
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: balanceChange } },
        });
      }

      return transaction;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create transaction', error: error.message });
  }
});

// PUT update transaction (adjusts account balance(s) atomically)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existingTx = await prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!existingTx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const updateSchema = transactionSchema.partial();
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const newAccountId = parsed.data.accountId || existingTx.accountId;
    const newToAccountId = parsed.data.toAccountId !== undefined ? parsed.data.toAccountId : existingTx.toAccountId;
    const newAmount = parsed.data.amount !== undefined ? parsed.data.amount : Number(existingTx.amount);
    const newType = parsed.data.type || existingTx.type;

    if (parsed.data.accountId && parsed.data.accountId !== existingTx.accountId) {
      const targetAcc = await prisma.account.findFirst({
        where: { id: parsed.data.accountId, userId },
      });
      if (!targetAcc) {
        return res.status(404).json({ message: 'Target account not found' });
      }
    }

    if (newType === 'TRANSFER') {
      if (!newToAccountId || newToAccountId === newAccountId) {
        return res.status(400).json({ message: 'Transfers require a different destination wallet' });
      }
      const destAcc = await prisma.account.findFirst({
        where: { id: newToAccountId, userId },
      });
      if (!destAcc) {
        return res.status(404).json({ message: 'Destination account not found' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Revert previous balance impact
      const oldAmount = Number(existingTx.amount);
      if (existingTx.type === 'TRANSFER') {
        await tx.account.update({
          where: { id: existingTx.accountId },
          data: { balance: { increment: oldAmount } },
        });
        if (existingTx.toAccountId) {
          await tx.account.update({
            where: { id: existingTx.toAccountId },
            data: { balance: { decrement: oldAmount } },
          });
        }
      } else {
        const oldRevert = existingTx.type === 'INCOME' ? -oldAmount : oldAmount;
        await tx.account.update({
          where: { id: existingTx.accountId },
          data: { balance: { increment: oldRevert } },
        });
      }

      // 2. Apply new balance impact
      if (newType === 'TRANSFER' && newToAccountId) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { decrement: newAmount } },
        });
        await tx.account.update({
          where: { id: newToAccountId },
          data: { balance: { increment: newAmount } },
        });
      } else {
        const newApply = newType === 'INCOME' ? newAmount : -newAmount;
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { increment: newApply } },
        });
      }

      // 3. Update transaction record
      const updateData: any = {};
      if (parsed.data.accountId) updateData.accountId = parsed.data.accountId;
      if (parsed.data.toAccountId !== undefined) updateData.toAccountId = parsed.data.toAccountId;
      if (parsed.data.categoryId !== undefined) updateData.categoryId = parsed.data.categoryId;
      if (parsed.data.type) updateData.type = parsed.data.type;
      if (parsed.data.transferTag !== undefined) updateData.transferTag = parsed.data.transferTag;
      if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
      if (parsed.data.date) updateData.date = new Date(parsed.data.date);
      if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

      const result = await tx.transaction.update({
        where: { id },
        data: updateData,
        include: {
          account: true,
          toAccount: true,
          category: true,
        },
      });

      return result;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update transaction', error: error.message });
  }
});

// DELETE transaction (reverts account balance(s) atomically)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await prisma.$transaction(async (tx) => {
      const amount = Number(transaction.amount);
      if (transaction.type === 'TRANSFER') {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: amount } },
        });
        if (transaction.toAccountId) {
          await tx.account.update({
            where: { id: transaction.toAccountId },
            data: { balance: { decrement: amount } },
          });
        }
      } else {
        const balanceChange = transaction.type === 'INCOME' ? -amount : amount;
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });
      }

      await tx.transaction.delete({
        where: { id },
      });
    });

    res.json({ message: 'Transaction deleted and account balance updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete transaction', error: error.message });
  }
});

export default router;
