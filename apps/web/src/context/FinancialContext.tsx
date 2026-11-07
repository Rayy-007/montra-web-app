'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

export interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'MOBILE_WALLET' | 'BANK' | 'SAVINGS';
  balance: number;
  startingBalance?: number;
  budgetLimit?: number | null;
}

export interface MonthlyAccount extends Account {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon?: string;
  color?: string;
}

export interface InsightsData {
  actualInsight: {
    totalIncome: number;
    totalExpense: number;
    net: number;
  };
  expectedInsight: {
    totalIncome: number;
    totalExpense: number;
    net: number;
  };
  totalWalletBalance: number;
  accounts: Account[];
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    color: string;
    amount: number;
  }[];
}

interface FinancialContextType {
  month: number;
  year: number;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  insights: InsightsData | null;
  accounts: Account[];
  monthlyAccounts: MonthlyAccount[];
  categories: Category[];
  loading: boolean;
  refreshData: () => Promise<void>;

  // Fast caching system for Expenses, Budgets, and Incomes
  getCachedExpenses: (m?: number, y?: number) => any[] | null;
  setCachedExpenses: (data: any[], m?: number, y?: number) => void;
  getCachedBudgets: (m?: number, y?: number) => any | null;
  setCachedBudgets: (data: any, m?: number, y?: number) => void;
  getCachedIncomes: (m?: number, y?: number) => any | null;
  setCachedIncomes: (data: any, m?: number, y?: number) => void;
  invalidateCache: () => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [monthlyAccounts, setMonthlyAccounts] = useState<MonthlyAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // In-memory cache dictionaries keyed by `month-year`
  const expensesCache = useRef<Record<string, any[]>>({});
  const budgetsCache = useRef<Record<string, any>>({});
  const incomesCache = useRef<Record<string, any>>({});

  const getKey = (m?: number, y?: number) => `${m || month}-${y || year}`;

  const getCachedExpenses = useCallback((m?: number, y?: number) => {
    return expensesCache.current[getKey(m, y)] || null;
  }, [month, year]);

  const setCachedExpenses = useCallback((data: any[], m?: number, y?: number) => {
    expensesCache.current[getKey(m, y)] = data;
  }, [month, year]);

  const getCachedBudgets = useCallback((m?: number, y?: number) => {
    return budgetsCache.current[getKey(m, y)] || null;
  }, [month, year]);

  const setCachedBudgets = useCallback((data: any, m?: number, y?: number) => {
    budgetsCache.current[getKey(m, y)] = data;
  }, [month, year]);

  const getCachedIncomes = useCallback((m?: number, y?: number) => {
    return incomesCache.current[getKey(m, y)] || null;
  }, [month, year]);

  const setCachedIncomes = useCallback((data: any, m?: number, y?: number) => {
    incomesCache.current[getKey(m, y)] = data;
  }, [month, year]);

  const invalidateCache = useCallback(() => {
    expensesCache.current = {};
    budgetsCache.current = {};
    incomesCache.current = {};
  }, []);

  const refreshData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const calls: Promise<any>[] = [
        api.get(`/insights/month?month=${month}&year=${year}`),
        api.get(`/accounts/monthly?month=${month}&year=${year}`)
      ];

      // Only fetch categories if not loaded yet
      const shouldFetchCategories = categories.length === 0;
      if (shouldFetchCategories) {
        calls.push(api.get('/categories'));
      }

      const results = await Promise.all(calls);
      const insightsRes = results[0];
      const monthlyAccountsRes = results[1];

      setInsights(insightsRes.data);
      setAccounts(monthlyAccountsRes.data);
      setMonthlyAccounts(monthlyAccountsRes.data);

      if (shouldFetchCategories && results[2]) {
        setCategories(results[2].data);
      }
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setLoading(false);
    }
  }, [token, month, year, categories.length]);

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token, month, year, refreshData]);

  return (
    <FinancialContext.Provider
      value={{
        month,
        year,
        setMonth,
        setYear,
        insights,
        accounts,
        monthlyAccounts,
        categories,
        loading,
        refreshData,
        getCachedExpenses,
        setCachedExpenses,
        getCachedBudgets,
        setCachedBudgets,
        getCachedIncomes,
        setCachedIncomes,
        invalidateCache
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinancialProvider');
  }
  return context;
};
