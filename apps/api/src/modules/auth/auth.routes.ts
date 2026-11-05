import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticateJwt, AuthRequest } from '../../middleware/auth';
import { seedDefaultUserData } from '../categories/seed';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  currency: z.string().default('MMK')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { email, name, password, currency } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        currency
      }
    });

    // Auto-seed default wallets and categories based on user's personal sheet
    await seedDefaultUserData(prisma, user.id);

    const secret = process.env.JWT_SECRET || 'montra_default_secret_key';
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration', error: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const secret = process.env.JWT_SECRET || 'montra_default_secret_key';
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login', error: error.message });
  }
});

router.get('/me', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true, email: true, name: true, currency: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to retrieve profile', error: error.message });
  }
});

export default router;
