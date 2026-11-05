import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticateJwt);

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['EXPENSE', 'INCOME']).default('EXPENSE'),
  icon: z.string().optional(),
  color: z.string().optional()
});

// GET categories
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query;

    const where: any = { userId };
    if (type && (type === 'EXPENSE' || type === 'INCOME')) {
      where.type = type;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
});

// POST category
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name: parsed.data.name,
        type: parsed.data.type,
        icon: parsed.data.icon,
        color: parsed.data.color
      }
    });

    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create category', error: error.message });
  }
});

// PUT category
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const updated = await prisma.category.updateMany({
      where: { id, userId },
      data: parsed.data
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const category = await prisma.category.findUnique({ where: { id } });
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update category', error: error.message });
  }
});

// DELETE category
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await prisma.category.deleteMany({
      where: { id, userId }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
});

export default router;
