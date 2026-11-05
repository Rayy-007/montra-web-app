import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticateJwt);

const setBudgetItemSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  categoryId: z.string().uuid(),
  plannedAmount: z.number().nonnegative()
});

const customBudgetSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  categoryName: z.string().min(1),
  color: z.string().optional(),
  icon: z.string().optional(),
  plannedAmount: z.number().nonnegative()
});

// GET monthly budget overview with real-time actual spending and diff
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch budget, categories, and expense aggregates in parallel (1 roundtrip)
    const [budget, categories, expenseAggregates] = await Promise.all([
      prisma.budget.findUnique({
        where: {
          userId_month_year: { userId, month, year }
        },
        include: {
          items: {
            include: { category: true }
          }
        }
      }),
      prisma.category.findMany({
        where: { userId, type: 'EXPENSE' },
        orderBy: { name: 'asc' }
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
          categoryId: { not: null }
        },
        _sum: {
          amount: true
        }
      })
    ]);

    const expenseMap = new Map<string, number>();
    expenseAggregates.forEach((agg) => {
      if (agg.categoryId) {
        expenseMap.set(agg.categoryId, Number(agg._sum.amount || 0));
      }
    });

    let totalPlanned = 0;
    let totalActual = 0;

    const plannedMap = new Map<string, number>();
    if (budget?.items) {
      budget.items.forEach((item) => {
        plannedMap.set(item.categoryId, Number(item.plannedAmount));
      });
    }

    const categoryBudgets = categories.map((cat) => {
      const planned = plannedMap.get(cat.id) || 0;
      const actual = expenseMap.get(cat.id) || 0;
      const diff = planned - actual;
      const percentage = planned > 0 ? Math.min(Math.round((actual / planned) * 100), 999) : (actual > 0 ? 100 : 0);

      totalPlanned += planned;
      totalActual += actual;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        icon: cat.icon,
        color: cat.color,
        plannedAmount: planned,
        actualExpense: actual,
        diff,
        percentageUsed: percentage
      };
    });

    res.json({
      month,
      year,
      summary: {
        totalPlannedBudget: totalPlanned,
        totalActualExpense: totalActual,
        totalRemainingDiff: totalPlanned - totalActual
      },
      categories: categoryBudgets
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch budget', error: error.message });
  }
});

// POST set category budget item
router.post('/items', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = setBudgetItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { month, year, categoryId, plannedAmount } = parsed.data;

    // Ensure budget header exists
    let budget = await prisma.budget.findUnique({
      where: {
        userId_month_year: { userId, month, year }
      }
    });

    if (!budget) {
      budget = await prisma.budget.create({
        data: { userId, month, year, totalBudget: 0 }
      });
    }

    // Upsert budget item
    const item = await prisma.budgetItem.upsert({
      where: {
        budgetId_categoryId: {
          budgetId: budget.id,
          categoryId
        }
      },
      update: { plannedAmount },
      create: {
        budgetId: budget.id,
        categoryId,
        plannedAmount
      },
      include: { category: true }
    });

    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to set budget item', error: error.message });
  }
});

// POST custom budget: creates or finds an expense category AND allocates budget amount
router.post('/custom', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = customBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { month, year, categoryName, color, icon, plannedAmount } = parsed.data;
    const trimmedName = categoryName.trim();

    // Check if category already exists for user (case-insensitive)
    let category = await prisma.category.findFirst({
      where: {
        userId,
        type: 'EXPENSE',
        name: { equals: trimmedName, mode: 'insensitive' }
      }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          userId,
          name: trimmedName,
          type: 'EXPENSE',
          color: color || '#10b981',
          icon: icon || 'Tag'
        }
      });
    }

    // Ensure budget header exists
    let budget = await prisma.budget.findUnique({
      where: {
        userId_month_year: { userId, month, year }
      }
    });

    if (!budget) {
      budget = await prisma.budget.create({
        data: { userId, month, year, totalBudget: 0 }
      });
    }

    // Upsert budget item
    const item = await prisma.budgetItem.upsert({
      where: {
        budgetId_categoryId: {
          budgetId: budget.id,
          categoryId: category.id
        }
      },
      update: { plannedAmount },
      create: {
        budgetId: budget.id,
        categoryId: category.id,
        plannedAmount
      },
      include: { category: true }
    });

    res.status(201).json({
      item,
      category
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create custom budget', error: error.message });
  }
});

// DELETE category budget item for month (resets allocation to 0)
router.delete('/items/:categoryId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { categoryId } = req.params;
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

    const budget = await prisma.budget.findUnique({
      where: { userId_month_year: { userId, month, year } }
    });

    if (budget) {
      await prisma.budgetItem.deleteMany({
        where: { budgetId: budget.id, categoryId }
      });
    }

    res.json({ message: 'Budget allocation removed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to remove budget item', error: error.message });
  }
});

export default router;
