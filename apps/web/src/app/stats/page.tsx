'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  PiggyBank,
  RotateCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { useToast } from '../../context/ToastContext';
import { formatMMK, MONTHS } from '../../lib/utils';
import { ProgressLoading } from '../../components/ProgressLoading';
import { CategoryIcon } from '../../components/CategoryIcon';
import { getWalletVisual } from '../../components/WalletBadge';
import { MonthlySummaryModal } from '../../components/MonthlySummaryModal';
import api from '../../lib/api';

type ViewMode = 'MONTH' | 'YEAR';

interface MonthStatsResponse {
  month: number;
  year: number;
  summary: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    totalPlannedBudget: number;
    totalSaved: number;
    totalReserveDraws: number;
    savingsRate: number;
    avgDailySpend: number;
    activeDaysCount: number;
    highestSpendDay: { day: number; date: string; amount: number } | null;
  };
  dailySeries: Array<{
    day: number;
    label: string;
    date: string;
    income: number;
    expense: number;
    txCount: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    icon: string | null;
    amount: number;
    plannedAmount: number;
    percentage: number;
    isOverBudget: boolean;
  }>;
  walletUsage: Array<{
    accountId: string;
    name: string;
    type: string;
    color: string | null;
    icon: string | null;
    expenseTotal: number;
    txCount: number;
    percentage: number;
  }>;
}

interface YearStatsResponse {
  year: number;
  summary: {
    year: number;
    totalIncome: number;
    totalExpense: number;
    netCashflow: number;
    totalSaved: number;
    totalReserveDraws: number;
    savingsRate: number;
    avgMonthlyExpense: number;
    activeMonthsCount: number;
    highestSpendMonth: { month: number; label: string; amount: number } | null;
    highestIncomeMonth: { month: number; label: string; amount: number } | null;
  };
  monthlySeries: Array<{
    month: number;
    label: string;
    income: number;
    expense: number;
    net: number;
    saved: number;
    reserveDraws: number;
    plannedBudget: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    icon: string | null;
    amount: number;
    percentage: number;
  }>;
  walletUsage: Array<{
    accountId: string;
    name: string;
    type: string;
    color: string | null;
    icon: string | null;
    expenseTotal: number;
    txCount: number;
    percentage: number;
  }>;
}

function formatCompactAxis(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${Math.round(val / 1_000)}k`;
  return String(val);
}

const ChartTooltipCard = ({
  active,
  payload,
  label,
  titlePrefix = '',
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  titlePrefix?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-3.5 py-2.5 text-xs space-y-1">
      {label !== undefined && (
        <div className="font-bold text-slate-900 dark:text-slate-100 pb-0.5 border-b border-slate-100 dark:border-slate-800">
          {titlePrefix}
          {label}
        </div>
      )}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || '#10B981' }}
            />
            <span>{entry.name}:</span>
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {formatMMK(Number(entry.value || 0))}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function StatsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { month, year, setMonth, setYear } = useFinance();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  const [statsYear, setStatsYear] = useState<number>(year);
  const [monthStats, setMonthStats] = useState<MonthStatsResponse | null>(null);
  const [yearStats, setYearStats] = useState<YearStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setStatsYear(year);
  }, [year]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadStats = useCallback(
    async (forceRefresh = false) => {
      if (!user) return;
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);

      try {
        if (viewMode === 'MONTH') {
          const res = await api.get(`/insights/stats/month?month=${month}&year=${year}`);
          setMonthStats(res.data);
        } else {
          const res = await api.get(`/insights/stats/year?year=${statsYear}`);
          setYearStats(res.data);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [user, viewMode, month, year, statsYear]
  );

  useEffect(() => {
    loadStats(false);
  }, [loadStats]);

  const handleStepMonth = (delta: -1 | 1) => {
    let nextM = month + delta;
    let nextY = year;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    } else if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setMonth(nextM);
    setYear(nextY);
    const label = MONTHS.find((m) => m.value === nextM)?.label || `Month ${nextM}`;
    showToast(`Switched to ${label} ${nextY}`, 'info');
  };

  const handleJumpToMonth = (targetMonth: number) => {
    setMonth(targetMonth);
    setYear(statsYear);
    setViewMode('MONTH');
    const label = MONTHS.find((m) => m.value === targetMonth)?.label || `Month ${targetMonth}`;
    showToast(`Viewing ${label} ${statsYear} stats`, 'info');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Loading session..." theme="indigo" />
      </div>
    );
  }

  const currentMonthLabel = MONTHS.find((m) => m.value === month)?.label || 'Month';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & View Mode Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Financial Reports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Stats
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {viewMode === 'MONTH'
              ? `Monthly breakdown for ${currentMonthLabel} ${year}`
              : `Full-year overview for ${statsYear}`}
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Switch: By Month vs By Year */}
          <div className="inline-flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'MONTH'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              By Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('YEAR')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'YEAR'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              By Year
            </button>
          </div>

          {/* Period Stepper */}
          {viewMode === 'MONTH' ? (
            <div className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => handleStepMonth(-1)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {currentMonthLabel.slice(0, 3)} {year}
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleStepMonth(1)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setStatsYear((y) => y - 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Previous year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{statsYear}</span>
              </span>
              <button
                type="button"
                onClick={() => setStatsYear((y) => y + 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Next year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={() => loadStats(true)}
            disabled={isRefreshing || loading}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm transition-all disabled:opacity-50"
            title="Refresh stats"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          {viewMode === 'MONTH' && (
            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="py-2 px-3.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          )}
        </div>
      </div>

      {loading && !(viewMode === 'MONTH' ? monthStats : yearStats) ? (
        <div className="py-16 flex justify-center">
          <ProgressLoading message="Analyzing your financial data..." theme="indigo" />
        </div>
      ) : viewMode === 'MONTH' && monthStats ? (
        <MonthlyStatsView stats={monthStats} monthLabel={currentMonthLabel} />
      ) : viewMode === 'YEAR' && yearStats ? (
        <YearlyStatsView stats={yearStats} onSelectMonth={handleJumpToMonth} />
      ) : null}

      <MonthlySummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        month={month}
        year={year}
      />
    </div>
  );
}

/* ============================================================================
 * MONTHLY VIEW COMPONENT
 * ========================================================================== */
function MonthlyStatsView({
  stats,
  monthLabel,
}: {
  stats: MonthStatsResponse;
  monthLabel: string;
}) {
  const { summary, dailySeries, categoryBreakdown, walletUsage } = stats;
  const spentCategories = categoryBreakdown.filter((c) => c.amount > 0);
  const budgetComparisonData = categoryBreakdown
    .filter((c) => c.plannedAmount > 0 || c.amount > 0)
    .slice(0, 8)
    .map((c) => ({
      name: c.categoryName.length > 12 ? `${c.categoryName.slice(0, 11)}…` : c.categoryName,
      fullName: c.categoryName,
      Planned: c.plannedAmount,
      Actual: c.amount,
    }));

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {formatMMK(summary.totalIncome)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Savings rate: <strong className="text-slate-700 dark:text-slate-200">{summary.savingsRate}%</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Total Spent</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
            {formatMMK(summary.totalExpense)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Avg / day: <strong className="text-slate-700 dark:text-slate-200">{formatMMK(summary.avgDailySpend)}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Net Leftover</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div
            className={`text-lg sm:text-2xl font-black mt-1.5 ${
              summary.net >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMMK(summary.net)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {summary.totalPlannedBudget > 0
              ? `Budget: ${formatMMK(summary.totalPlannedBudget)}`
              : `${summary.activeDaysCount} active spend days`}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Saved This Month</span>
            <PiggyBank className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-teal-600 dark:text-teal-400 mt-1.5">
            {formatMMK(summary.totalSaved)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-1">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>
              {summary.highestSpendDay
                ? `Peak Day ${summary.highestSpendDay.day}: ${formatMMK(summary.highestSpendDay.amount)}`
                : 'No spending spikes yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: Category Donut + Daily Spending Rhythm */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart: Where Money Went */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Where Your Money Went</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Spending share by category</p>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {spentCategories.length} categories
            </span>
          </div>

          {spentCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spentCategories}
                      dataKey="amount"
                      nameKey="categoryName"
                      cx="50%"
                      cy="50%"
                      innerRadius="56%"
                      outerRadius="85%"
                      paddingAngle={2.5}
                      stroke="none"
                    >
                      {spentCategories.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.color || '#94A3B8'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipCard />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Total
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {formatCompactAxis(summary.totalExpense)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {spentCategories.map((cat) => (
                  <div key={cat.categoryId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cat.color}1A` }}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {cat.categoryName}
                      </span>
                    </div>
                    <div className="text-right ml-2 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{formatMMK(cat.amount)}</div>
                      <div className="text-[10px] text-slate-400">{cat.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChartState message={`No category expenses recorded in ${monthLabel}.`} />
          )}
        </div>

        {/* Daily Spending Bar Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Daily Spending Rhythm</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Day-by-day spending across {monthLabel}
              </p>
            </div>
            {summary.avgDailySpend > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Avg {formatMMK(summary.avgDailySpend)}/day
              </span>
            )}
          </div>

          {summary.totalExpense > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.18} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    tickFormatter={formatCompactAxis}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltipCard titlePrefix={`${monthLabel} Day `} />} />
                  {summary.avgDailySpend > 0 && (
                    <ReferenceLine
                      y={summary.avgDailySpend}
                      stroke="#6366f1"
                      strokeDasharray="4 4"
                      opacity={0.75}
                    />
                  )}
                  <Bar dataKey="expense" name="Spent" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartState message={`No daily spending logged in ${monthLabel}.`} />
          )}
        </div>
      </div>

      {/* Row 2: Budget vs Actual + Wallet Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Planned vs Actual Bar Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Planned Budget vs. Actual Spent</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Top categories compared against monthly limits</p>
          </div>

          {budgetComparisonData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetComparisonData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.18} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatCompactAxis}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltipCard />} />
                  <Bar dataKey="Planned" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartState message="No budgets or category expenses set for this month yet." />
          )}
        </div>

        {/* Wallet Spending Share & Bank Top-Ups */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Spending by Wallet</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Which accounts paid for this month</p>
            </div>
            <WalletIcon className="w-4 h-4 text-slate-400" />
          </div>

          {walletUsage.length > 0 ? (
            <div className="space-y-3.5">
              {walletUsage.map((w) => {
                const { Icon, color } = getWalletVisual(w.type, w.color, w.icon);
                return (
                  <div key={w.accountId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${color}1A`, color }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">{w.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {w.txCount} {w.txCount === 1 ? 'expense' : 'expenses'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{formatMMK(w.expenseTotal)}</div>
                        <div className="text-[10px] text-slate-400">{w.percentage}%</div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${w.percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}

              {summary.totalReserveDraws > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between text-xs">
                  <span className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-semibold">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>Extra Money Taken From Main Bank</span>
                  </span>
                  <span className="font-black text-amber-700 dark:text-amber-300">
                    {formatMMK(summary.totalReserveDraws)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <EmptyChartState message={`No wallet expenses logged in ${monthLabel}.`} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * YEARLY VIEW COMPONENT
 * ========================================================================== */
function YearlyStatsView({
  stats,
  onSelectMonth,
}: {
  stats: YearStatsResponse;
  onSelectMonth: (month: number) => void;
}) {
  const { summary, monthlySeries, categoryBreakdown } = stats;
  const topCategories = categoryBreakdown.filter((c) => c.amount > 0);

  return (
    <div className="space-y-6">
      {/* Annual KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>{summary.year} Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {formatMMK(summary.totalIncome)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {summary.highestIncomeMonth
              ? `Best: ${summary.highestIncomeMonth.label} (${formatCompactAxis(summary.highestIncomeMonth.amount)})`
              : 'No income recorded'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>{summary.year} Expense</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
            {formatMMK(summary.totalExpense)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Avg / month: <strong className="text-slate-700 dark:text-slate-200">{formatMMK(summary.avgMonthlyExpense)}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Yearly Leftover</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div
            className={`text-lg sm:text-2xl font-black mt-1.5 ${
              summary.netCashflow >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMMK(summary.netCashflow)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Yearly savings rate: <strong className="text-slate-700 dark:text-slate-200">{summary.savingsRate}%</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Total Saved</span>
            <PiggyBank className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-teal-600 dark:text-teal-400 mt-1.5">
            {formatMMK(summary.totalSaved)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {summary.highestSpendMonth
              ? `Highest spend: ${summary.highestSpendMonth.label} (${formatCompactAxis(summary.highestSpendMonth.amount)})`
              : 'No expenses recorded'}
          </div>
        </div>
      </div>

      {/* Hero Chart: Monthly Income vs Expense (Jan..Dec) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Monthly Income vs. Expense ({summary.year})
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Compare how much came in and went out each month • Click a month row below to open its details
            </p>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-semibold">
            <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>Income</span>
            </span>
            <span className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span>Expense</span>
            </span>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlySeries}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onClick={(state: any) => {
                const payload = state?.activePayload?.[0]?.payload;
                if (payload?.month) onSelectMonth(payload.month);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.18} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCompactAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltipCard titlePrefix={`${summary.year} • `} />} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18} className="cursor-pointer" />
              <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={18} className="cursor-pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Net Cashflow & Savings Trend + Annual Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Leftover & Savings Area Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Monthly Leftover &amp; Savings Trend
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Net cashflow alongside money saved into goals
            </p>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="savedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.18} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactAxis} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipCard titlePrefix={`${summary.year} • `} />} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.5} />
                <Area type="monotone" dataKey="net" name="Net Leftover" stroke="#6366f1" strokeWidth={2} fill="url(#netGrad)" />
                <Area type="monotone" dataKey="saved" name="Saved to Goals" stroke="#14b8a6" strokeWidth={2} fill="url(#savedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Annual Category Donut */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {summary.year} Category Breakdown
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Top spending categories for the entire year</p>
            </div>
          </div>

          {topCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategories}
                      dataKey="amount"
                      nameKey="categoryName"
                      cx="50%"
                      cy="50%"
                      innerRadius="56%"
                      outerRadius="85%"
                      paddingAngle={2.5}
                      stroke="none"
                    >
                      {topCategories.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.color || '#94A3B8'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipCard />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {summary.year}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {formatCompactAxis(summary.totalExpense)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {topCategories.map((cat) => (
                  <div key={cat.categoryId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cat.color}1A` }}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {cat.categoryName}
                      </span>
                    </div>
                    <div className="text-right ml-2 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{formatMMK(cat.amount)}</div>
                      <div className="text-[10px] text-slate-400">{cat.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChartState message={`No expenses logged in ${summary.year} yet.`} />
          )}
        </div>
      </div>

      {/* Month-by-Month Ledger Summary Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Month-by-Month Summary ({summary.year})
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Tap any month row to view its monthly charts</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-right">Income</th>
                <th className="py-3 px-4 text-right">Expense</th>
                <th className="py-3 px-4 text-right">Leftover</th>
                <th className="py-3 px-4 text-right">Saved</th>
                <th className="py-3 px-4 text-right">Bank Top-Ups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthlySeries.map((row) => (
                <tr
                  key={row.month}
                  onClick={() => onSelectMonth(row.month)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{row.label}</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatMMK(row.income)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-rose-600 dark:text-rose-400">
                    {formatMMK(row.expense)}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-bold ${
                      row.net >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatMMK(row.net)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-teal-600 dark:text-teal-400">
                    {formatMMK(row.saved)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                    {row.reserveDraws > 0 ? formatMMK(row.reserveDraws) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 space-y-2">
      <BarChart3 className="w-8 h-8 stroke-1" />
      <p className="text-xs">{message}</p>
    </div>
  );
}
