import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './modules/auth/auth.routes';
import accountRoutes from './modules/accounts/account.routes';
import categoryRoutes from './modules/categories/category.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import incomeRoutes from './modules/incomes/income.routes';
import budgetRoutes from './modules/budgets/budget.routes';
import insightRoutes from './modules/insights/insight.routes';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Root route — shows API info in browser (prevents "Cannot GET /")
app.get('/', (req, res) => {
  res.json({
    app: 'Montra API',
    version: '1.0.0',
    status: 'running',
    message: 'Montra Money Tracker REST API is operational.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      accounts: '/api/accounts',
      categories: '/api/categories',
      transactions: '/api/transactions',
      incomes: '/api/incomes',
      budgets: '/api/budgets',
      insights: '/api/insights',
    },
    time: new Date().toISOString()
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Montra API Service',
    time: new Date().toISOString()
  });
});

// Register Modules
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/insights', insightRoutes);

// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`🚀 Montra API Server is running on http://localhost:${port}`);
});
