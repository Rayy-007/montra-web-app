'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  PieChart as PieChartIcon,
  ChevronRight,
  Clock,
  Download,
  ArrowLeftRight,
  ShieldAlert,
  PiggyBank,
  Landmark,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinancialContext';
import { formatMMK, MONTHS, formatDateTime } from '../lib/utils';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { AddIncomeModal } from '../components/AddIncomeModal';
import { TransferModal } from '../components/TransferModal';
import { MonthlySummaryModal } from '../components/MonthlySummaryModal';
import { CategoryIcon } from '../components/CategoryIcon';
import { getWalletVisual } from '../components/WalletBadge';
import { ProgressLoading } from '../components/ProgressLoading';
import { InfoTooltip } from '../components/InfoTooltip';
import api from '../lib/api';

const TRANSFER_TAG_LABELS: Record<string, string> = {
  RESERVE_DRAW: 'Extra Bank Top-Up',
  FAMILY_EXCHANGE: 'Family Swap',
  CASH_WITHDRAWAL: 'Get Cash',
  SAVINGS_CONTRIBUTION: 'Put Into Savings',
  TOP_UP: 'Top Up Wallet',
};

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { month, year, insights, accounts, loading, refreshData } = useFinance();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const loadRecent = useCallback(() => {
    if (!user) return;
    api
      .get(`/transactions?month=${month}&year=${year}`)
      .then((res) => setRecentTransactions(res.data.slice(0, 5)))
      .catch((err) => console.error('Failed to load recent transactions:', err));
  }, [user, month, year]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Loading your home overview..." theme="emerald" />
      </div>
    );
  }

  if (loading && !insights) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Preparing financial summary..." theme="emerald" />
      </div>
    );
  }

  const currentMonthName = MONTHS.find((m) => m.value === month)?.label || 'Month';
  const dailyLeftBalance = insights?.coachMetrics?.dailySpendingBalance ?? 0;
  const totalExpense = insights?.actualInsight.totalExpense ?? 0;
  const totalIncome = insights?.actualInsight.totalIncome ?? 0;
  const budgetLimit = insights?.expectedInsight.totalExpense ?? 0;
  const budgetUsedPct = budgetLimit > 0 ? Math.min(Math.round((totalExpense / budgetLimit) * 100), 100) : 0;
  const totalSavings = insights?.coachMetrics?.totalEarmarkedSavings ?? 0;
  const savedThisMonth = insights?.coachMetrics?.totalSavedThisMonth ?? 0;
  const reserveBalance = insights?.coachMetrics?.reserveBalance ?? 0;
  const reserveDraws = insights?.coachMetrics?.totalReserveDraws ?? 0;
  const budgetOverrun = insights?.coachMetrics?.budgetOverrun ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Minimalist Top Bar: Greeting / Period + Organized Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Home
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70">
              {currentMonthName} {year}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Net Worth across all wallets:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {formatMMK(insights?.totalWalletBalance || 0)}
            </span>
            <InfoTooltip content="Includes Daily Spending (Cash/KPay), Main Bank reserve, and Saved Goal money." />
          </div>
        </div>

        {/* Organized Quick Actions Dock */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Income</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            title="Move money between wallets"
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-1.5"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Move Money</span>
          </button>

          <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          <button
            onClick={() => router.push('/stats')}
            title="Open Monthly & Yearly Stats"
            className="py-2 px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl text-xs transition-all flex items-center space-x-1.5"
          >
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span>Stats</span>
          </button>

          <button
            onClick={() => setIsSummaryModalOpen(true)}
            title="Download Monthly Summary PDF"
            className="py-2 px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl text-xs transition-all flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Hero 3-Metric Strip: Daily Left Balance, Total Expense, Total Savings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Daily Left Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daily Left Balance
            </span>
            <span className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {formatMMK(dailyLeftBalance)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ready in Daily Wallets • Bank backup: {formatMMK(reserveBalance)}
            </p>
          </div>
        </div>

        {/* 2. Total Expense */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Expense ({currentMonthName})
            </span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                {formatMMK(totalExpense)}
              </span>
              {budgetLimit > 0 && (
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {budgetUsedPct}% of {formatMMK(budgetLimit)}
                </span>
              )}
            </div>
            {budgetLimit > 0 ? (
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalExpense > budgetLimit ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Income this month: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMMK(totalIncome)}</span>
              </p>
            )}
          </div>
        </div>

        {/* 3. Total Savings */}
        <div
          onClick={() => router.push('/savings')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Savings
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatMMK(totalSavings)}
            </div>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">
              +{formatMMK(savedThisMonth)} added in {currentMonthName} • Tap to manage →
            </p>
          </div>
        </div>
      </div>

      {/* Money Overview & Bank Top-Ups */}
      {insights?.coachMetrics && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Landmark className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Money Overview &amp; Bank Top-Ups
              </h2>
            </div>
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <button
                onClick={() => router.push('/budgets')}
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Budgets
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Move Money</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Actual Income
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatMMK(totalIncome)}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                Expected: {formatMMK(insights.expectedInsight.totalIncome)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Monthly Leftover
              </div>
              <div
                className={`text-base sm:text-lg font-black mt-0.5 ${
                  insights.actualInsight.net >= 0
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatMMK(insights.actualInsight.net)}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                Income minus Expense
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Main Bank
              </div>
              <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {formatMMK(reserveBalance)}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                Bank balance kept aside
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                reserveDraws > 0 || budgetOverrun > 0
                  ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-800/50'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-transparent'
              }`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider flex items-center space-x-1 ${
                  reserveDraws > 0 || budgetOverrun > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Taken From Bank</span>
              </div>
              <div
                className={`text-base sm:text-lg font-black mt-0.5 ${
                  reserveDraws > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {formatMMK(reserveDraws)}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                {budgetOverrun > 0 ? `Over budget by ${formatMMK(budgetOverrun)}` : 'Extra bank top-ups'}
              </div>
            </div>
          </div>

          {insights.coachMetrics.reserveDrawItems && insights.coachMetrics.reserveDrawItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Bank Draws ({currentMonthName}):
              </span>
              {insights.coachMetrics.reserveDrawItems.slice(0, 4).map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                >
                  <span>{item.fromAccountName} → {item.toAccountName}:</span>
                  <span className="text-amber-700 dark:text-amber-300 font-bold">{formatMMK(item.amount)}</span>
                  <span className="text-slate-400">({formatDateTime(item.date)})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Two Column Minimalist Section: Top Expense Categories & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Expense Categories */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <PieChartIcon className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Top Expense Categories</h3>
            </div>
            <button
              onClick={() => router.push('/budgets')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View Budgets
            </button>
          </div>

          {insights?.categoryBreakdown && insights.categoryBreakdown.length > 0 ? (
            <div className="space-y-3.5">
              {insights.categoryBreakdown.slice(0, 5).map((item) => {
                const totalExp = insights.actualInsight.totalExpense || 1;
                const pct = Math.round((item.amount / totalExp) * 100);
                const color = item.color || '#10b981';
                return (
                  <div key={item.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}1A` }}
                        >
                          <CategoryIcon icon={item.icon} color={color} className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 truncate">{item.categoryName}</span>
                      </div>
                      <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap ml-2">
                        {formatMMK(item.amount)} <span className="text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-slate-400 dark:text-slate-500">
              <Receipt className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-xs">No expenses recorded for {currentMonthName} yet.</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Transactions</h3>
            </div>
            <button
              onClick={() => router.push('/expenses')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View All
            </button>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                const isTransfer = tx.type === 'TRANSFER';
                return (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isTransfer
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                            : isIncome
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : tx.category?.color
                            ? ''
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        }`}
                        style={
                          !isTransfer && !isIncome && tx.category?.color
                            ? { backgroundColor: `${tx.category.color}1A`, color: tx.category.color }
                            : undefined
                        }
                      >
                        {isTransfer ? (
                          <ArrowLeftRight className="w-4 h-4" />
                        ) : isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : tx.category?.icon ? (
                          <CategoryIcon icon={tx.category.icon} color={tx.category.color} className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {isTransfer
                            ? `${tx.account?.name} → ${tx.toAccount?.name || 'Wallet'}`
                            : tx.category?.name || (isIncome ? 'Income' : 'Expense')}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {isTransfer
                            ? TRANSFER_TAG_LABELS[tx.transferTag] || 'Transfer'
                            : tx.account?.name}{' '}
                          • {formatDateTime(tx.date)}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-xs sm:text-sm font-bold whitespace-nowrap ${
                        isTransfer
                          ? 'text-sky-600 dark:text-sky-400'
                          : isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {isTransfer ? '' : isIncome ? '+' : '-'}
                      {formatMMK(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-slate-400 dark:text-slate-500">
              <Receipt className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-xs">No transactions found for {currentMonthName}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Your Wallets (Minimalist Cards with Custom Color & Icon) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Your Wallets
            </h2>
          </div>
          <button
            onClick={() => router.push('/wallets')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
          >
            <span>Manage Wallets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((acc) => {
            const { Icon: WalletIcon, color } = getWalletVisual(acc.type, acc.color, acc.icon);
            const roleBadge =
              acc.role === 'RESERVE'
                ? 'Main Bank'
                : acc.role === 'SAVINGS_HOLDING'
                ? 'For Savings'
                : 'Daily Use';

            return (
              <div
                key={acc.id}
                onClick={() => router.push('/wallets')}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}1A`, color }}
                  >
                    <WalletIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {roleBadge}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{acc.name}</div>
                <div className="text-xl font-black mt-0.5" style={{ color }}>
                  {formatMMK(acc.balance)}
                </div>

                {((acc.earmarkedSavings || 0) > 0 || acc.budgetLimit) && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    {(acc.earmarkedSavings || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>In Savings:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMMK(acc.earmarkedSavings || 0)}
                        </span>
                      </div>
                    )}
                    {acc.budgetLimit && (
                      <div className="flex justify-between">
                        <span>Monthly Limit:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatMMK(acc.budgetLimit)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          refreshData();
          loadRecent();
        }}
      />

      <AddIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSuccess={() => {
          refreshData();
          loadRecent();
        }}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          refreshData();
          loadRecent();
        }}
      />

      <MonthlySummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        month={month}
        year={year}
      />
    </div>
  );
}
