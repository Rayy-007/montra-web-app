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
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { formatMMK, MONTHS } from '../../lib/utils';
import { AddExpenseModal } from '../../components/AddExpenseModal';
import { AddIncomeModal } from '../../components/AddIncomeModal';
import { ProgressLoading } from '../../components/ProgressLoading';
import api from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { month, year, insights, accounts, loading, refreshData } = useFinance();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 sm:p-8 text-slate-900 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-400/5 to-transparent pointer-events-none" />

        <div className="relative space-y-1">
          <div className="flex items-center space-x-2 text-emerald-600 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Monthly Financial Overview</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {currentMonthName} {year} Financials
          </h1>

          <p className="text-slate-500 text-xs sm:text-sm">
            Total Combined Wallet Liquid Balance:
            <span className="text-slate-900 font-bold text-base ml-1">
              {formatMMK(insights?.totalWalletBalance || 0)}
            </span>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex-1 sm:flex-initial py-2.5 px-4 bg-white/60 hover:bg-white/90 text-emerald-700 border border-emerald-500/20 font-semibold rounded-xl text-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm backdrop-blur-xl"
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

      {/* Header Banner */}
      {/* <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Monthly Financial Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {currentMonthName} {year} Financials
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm">
            Total Combined Wallet Liquid Balance: <span className="text-white font-bold text-base ml-1">{formatMMK(insights?.totalWalletBalance || 0)}</span>
          </p>
        </div>

      <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 font-semibold rounded-xl text-sm transition-all flex items-center justify-center space-x-2"
          >
            <TrendingUp className="w-4 h-4 text-emerald-300" />
            <span>Add Income</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex-1 sm:flex-initial py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div> */}

      {/* Dual Insights Grid: Actual Insight vs Expected Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 className="text-base font-bold text-slate-900">Actual Insight</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Realized Cashflow
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-50/70 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500">Actual Income</span>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-600 truncate">
                {formatMMK(insights?.actualInsight.totalIncome || 0)}
              </div>
            </div>

            <div className="bg-slate-50/70 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500">Actual Expense</span>
              <div className="text-lg sm:text-xl font-extrabold text-rose-600 truncate">
                {formatMMK(insights?.actualInsight.totalExpense || 0)}
              </div>
            </div>

            <div className="bg-slate-50/70 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500">Net Surplus</span>
              <div className={`text-lg sm:text-xl font-extrabold truncate ${(insights?.actualInsight.net || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                {formatMMK(insights?.actualInsight.net || 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <h2 className="text-base font-bold text-slate-900">Expected Insight</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Planned Projection
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-50/70 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500">Expected Income</span>
              <div className="text-lg sm:text-xl font-extrabold text-indigo-600 truncate">
                {formatMMK(insights?.expectedInsight.totalIncome || 0)}
              </div>
            </div>

            <div className="bg-slate-50/70 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500">Planned Budget</span>
              <div className="text-lg sm:text-xl font-extrabold text-slate-700 truncate">
                {formatMMK(insights?.expectedInsight.totalExpense || 0)}
              </div>
            </div>

            <div className="bg-slate-50/70 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none space-y-1">
              <span className="text-xs font-medium text-slate-500">Expected Net</span>
              <div className={`text-lg sm:text-xl font-extrabold truncate ${(insights?.expectedInsight.net || 0) >= 0 ? 'text-indigo-700' : 'text-rose-600'
                }`}>
                {formatMMK(insights?.expectedInsight.net || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Category Spending Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Spending Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Top Expense Categories</h3>
            </div>
            <button
              onClick={() => router.push('/budgets')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
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
                      <span className="text-slate-800">{item.categoryName}</span>
                      <span className="text-slate-600">
                        {formatMMK(item.amount)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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
            <div className="text-center py-10 space-y-2 text-slate-400">
              <Receipt className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-xs">No expenses recorded for this month yet.</p>
            </div>
          )}
        </div>

        {/* Recent Transactions Ledger */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
            </div>
            <button
              onClick={() => router.push('/expenses')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View All
            </button>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                        {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-900">
                          {tx.category?.name || (isIncome ? 'Income' : 'Expense')}
                        </div>
                        <div className="text-xs text-slate-400">
                          {tx.account?.name} • {new Date(tx.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className={`text-xs sm:text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                      {isIncome ? '+' : '-'}{formatMMK(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-slate-400">
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
            <Wallet className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Your Wallets & Balances ("Where")
            </h2>
          </div>
          <button
            onClick={() => router.push('/wallets')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
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
            return (
              <div
                key={acc.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {typeLabel}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="text-base font-bold text-slate-900">{acc.name}</div>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  {formatMMK(acc.balance)}
                </div>
                {acc.budgetLimit && (
                  <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 flex justify-between">
                    <span>Monthly Limit:</span>
                    <span className="font-semibold text-slate-700">{formatMMK(acc.budgetLimit)}</span>
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
    </div>
  );
}
