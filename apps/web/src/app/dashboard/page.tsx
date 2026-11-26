'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Sparkles,
  PieChart as PieChartIcon,
  ChevronRight,
  Clock,
  Download,
  ArrowLeftRight,
  ShieldAlert,
  PiggyBank,
  Landmark
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { formatMMK, MONTHS } from '../../lib/utils';
import { AddExpenseModal } from '../../components/AddExpenseModal';
import { AddIncomeModal } from '../../components/AddIncomeModal';
import { TransferModal } from '../../components/TransferModal';
import { MonthlySummaryModal } from '../../components/MonthlySummaryModal';
import { ProgressLoading } from '../../components/ProgressLoading';
import { InfoTooltip } from '../../components/InfoTooltip';
import api from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { month, year, insights, accounts, loading, refreshData } = useFinance();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      api.get(`/transactions?month=${month}&year=${year}`)
        .then((res) => setRecentTransactions(res.data.slice(0, 5)))
        .catch((err) => console.error('Failed to load recent transactions:', err));
    }
  }, [user, month, year]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Authenticating session..." theme="emerald" />
      </div>
    );
  }

  if (loading && !insights) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Calculating financial metrics..." theme="emerald" />
      </div>
    );
  }

  const currentMonthName = MONTHS.find((m) => m.value === month)?.label || 'Month';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 dark:ring-slate-800 relative overflow-hidden transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-400/5 to-transparent pointer-events-none" />

        <div className="relative space-y-1">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Financial Overview</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
            Dashboard
          </h1>

          <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium pt-0.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{currentMonthName} {year}</span>
            <InfoTooltip content="Summary of your monthly income, expenses, savings, and wallet balances." />
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Balance:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {formatMMK(insights?.totalWalletBalance || 0)}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsSummaryModalOpen(true)}
            title="Download Monthly Summary PDF"
            className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-xl text-sm shadow-md transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Summary (PDF)</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            title="Move money between KPay, Cash, KBZ Bank, or AYA Bank"
            className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-semibold rounded-xl text-sm shadow-sm transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Move Money</span>
          </button>

          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex-1 sm:flex-initial py-2.5 px-4 bg-white/60 dark:bg-slate-800/80 hover:bg-white/90 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 font-semibold rounded-xl text-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm backdrop-blur-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Add Income</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex-1 sm:flex-initial py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-slate-900/20 transition-all duration-200 flex items-center justify-center space-x-2 backdrop-blur-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Dual Insights Grid: Real vs Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Actual Summary</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              This Month
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-50/70 dark:bg-slate-800/50 dark:sm:bg-transparent sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Income</span>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                {formatMMK(insights?.actualInsight.totalIncome || 0)}
              </div>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/50 dark:dark:sm:bg-transparent sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Expenses</span>
              <div className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-400 truncate">
                {formatMMK(insights?.actualInsight.totalExpense || 0)}
              </div>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/50 dark:sm:bg-transparent sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Leftover</span>
              <div className={`text-lg sm:text-xl font-extrabold truncate ${(insights?.actualInsight.net || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                {formatMMK(insights?.actualInsight.net || 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Planned Budget</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Monthly Goal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-50/70 dark:bg-slate-800/50 dark:sm:bg-transparent sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Expected Income</span>
              <div className="text-lg sm:text-xl font-extrabold text-indigo-600 dark:text-indigo-400 truncate">
                {formatMMK(insights?.expectedInsight.totalIncome || 0)}
              </div>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/50 dark:sm:bg-transparent sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Budget Limit</span>
              <div className="text-lg sm:text-xl font-extrabold text-slate-700 dark:text-slate-200 truncate">
                {formatMMK(insights?.expectedInsight.totalExpense || 0)}
              </div>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/50 dark:sm:bg-transparent sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Planned Leftover</span>
              <div className={`text-lg sm:text-xl font-extrabold truncate ${(insights?.expectedInsight.net || 0) >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                {formatMMK(insights?.expectedInsight.net || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Coach & Reserve Control Ribbon */}
      {insights?.coachMetrics && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Money Overview &amp; Bank Top-Ups</h2>
            </div>
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <button
                onClick={() => router.push('/savings')}
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <PiggyBank className="w-3.5 h-3.5" />
                <span>Savings Goals</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Daily Money
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {formatMMK(insights.coachMetrics.dailySpendingBalance)}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Ready in KPay &amp; Cash
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
                <Landmark className="w-3.5 h-3.5" />
                <span>Main Bank</span>
              </div>
              <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-1">
                {formatMMK(insights.coachMetrics.reserveBalance)}
              </div>
              <div className="text-[11px] text-indigo-500/80 dark:text-indigo-400/70 mt-0.5">
                Bank balance kept aside
              </div>
            </div>

            <div
              onClick={() => router.push('/savings')}
              className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <PiggyBank className="w-3.5 h-3.5" />
                <span>Saved in Goals</span>
              </div>
              <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {formatMMK(insights.coachMetrics.totalEarmarkedSavings)}
              </div>
              <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                +{formatMMK(insights.coachMetrics.totalSavedThisMonth)} added in {currentMonthName}
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                insights.coachMetrics.totalReserveDraws > 0 || insights.coachMetrics.budgetOverrun > 0
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
              }`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider flex items-center space-x-1 ${
                  insights.coachMetrics.totalReserveDraws > 0 || insights.coachMetrics.budgetOverrun > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Taken From Main Bank</span>
              </div>
              <div
                className={`text-lg font-black mt-1 ${
                  insights.coachMetrics.totalReserveDraws > 0
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {formatMMK(insights.coachMetrics.totalReserveDraws)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {insights.coachMetrics.budgetOverrun > 0
                  ? `Over budget by ${formatMMK(insights.coachMetrics.budgetOverrun)}`
                  : 'Bank → Daily wallet top-ups'}
              </div>
            </div>
          </div>

          {insights.coachMetrics.reserveDrawItems && insights.coachMetrics.reserveDrawItems.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Extra Money Taken From Bank ({currentMonthName} {year})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {insights.coachMetrics.reserveDrawItems.slice(0, 4).map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/60 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <span>{item.fromAccountName} → {item.toAccountName}:</span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">{formatMMK(item.amount)}</span>
                    <span className="text-slate-400">({new Date(item.date).toLocaleDateString()})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two Column Layout: Category Spending Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Spending Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Top Expense Categories</h3>
            </div>
            <button
              onClick={() => router.push('/budgets')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
            >
              View Full Budget
            </button>
          </div>

          {insights?.categoryBreakdown && insights.categoryBreakdown.length > 0 ? (
            <div className="space-y-4 pt-2">
              {insights.categoryBreakdown.slice(0, 6).map((item) => {
                const totalExp = insights.actualInsight.totalExpense || 1;
                const pct = Math.round((item.amount / totalExp) * 100);
                return (
                  <div key={item.categoryId} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">{item.categoryName}</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {formatMMK(item.amount)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.color || '#10b981',
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-slate-400 dark:text-slate-500">
              <Receipt className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-xs">No expenses recorded for this month yet.</p>
            </div>
          )}
        </div>

        {/* Recent Transactions Ledger */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Transactions</h3>
            </div>
            <button
              onClick={() => router.push('/expenses')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
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
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                        isTransfer
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                          : isIncome
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      }`}>
                        {isTransfer ? (
                          <ArrowLeftRight className="w-4 h-4" />
                        ) : isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {isTransfer
                            ? `${tx.account?.name} → ${tx.toAccount?.name || 'Wallet'}`
                            : tx.category?.name || (isIncome ? 'Income' : 'Expense')}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {isTransfer
                            ? tx.transferTag === 'RESERVE_DRAW'
                              ? 'Extra Bank Top-Up'
                              : tx.transferTag === 'FAMILY_EXCHANGE'
                              ? 'Family Swap'
                              : tx.transferTag === 'CASH_WITHDRAWAL'
                              ? 'Get Cash'
                              : tx.transferTag === 'SAVINGS_CONTRIBUTION'
                              ? 'Put Into Savings'
                              : 'Top Up Wallet'
                            : tx.account?.name}{' '}
                          • {new Date(tx.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className={`text-xs sm:text-sm font-bold ${
                      isTransfer
                        ? 'text-sky-600 dark:text-sky-400'
                        : isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {isTransfer ? '' : isIncome ? '+' : '-'}{formatMMK(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-slate-400 dark:text-slate-500">
              <Receipt className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-xs">No transactions found for this period.</p>
            </div>
          )}
        </div>
      </div>

      {/* Wallets & Accounts Ribbon ("Where") */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Your Wallets
            </h2>
          </div>
          <button
            onClick={() => router.push('/wallets')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center space-x-1"
          >
            <span>Manage Wallets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {accounts.map((acc) => {
            const typeLabel = acc.type === 'MOBILE_WALLET' ? 'Mobile Wallet'
              : acc.type === 'BANK' ? 'Bank Account'
                : acc.type === 'SAVINGS' ? 'Savings'
                  : 'Cash';
            const roleBadge = acc.role === 'RESERVE'
              ? { label: 'Main Bank', cls: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' }
              : acc.role === 'SAVINGS_HOLDING'
              ? { label: 'For Savings', cls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' }
              : { label: 'Daily Use', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' };
            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {typeLabel}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge.cls}`}>
                    {roleBadge.label}
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">{acc.name}</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatMMK(acc.balance)}
                </div>
                {(acc.earmarkedSavings || 0) > 0 && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <span>In Savings Goals:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMMK(acc.earmarkedSavings || 0)}
                    </span>
                  </div>
                )}
                {acc.budgetLimit && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <span>Monthly Limit:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMMK(acc.budgetLimit)}</span>
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
          api.get(`/transactions?month=${month}&year=${year}`)
            .then((res) => setRecentTransactions(res.data.slice(0, 5)));
        }}
      />

      <AddIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSuccess={() => {
          refreshData();
          api.get(`/transactions?month=${month}&year=${year}`)
            .then((res) => setRecentTransactions(res.data.slice(0, 5)));
        }}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          refreshData();
          api.get(`/transactions?month=${month}&year=${year}`)
            .then((res) => setRecentTransactions(res.data.slice(0, 5)));
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
