'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  PieChart as PieChartIcon, 
  Check, 
  Edit2, 
  AlertTriangle, 
  Sparkles, 
  TrendingDown, 
  Save, 
  Plus, 
  X, 
  Trash2, 
  RotateCw,
  Tag,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { formatMMK, formatNumber, MONTHS } from '../../lib/utils';
import { ProgressLoading } from '../../components/ProgressLoading';
import { SetBudgetModal, BudgetCategoryItem } from '../../components/SetBudgetModal';
import { InfoTooltip } from '../../components/InfoTooltip';
import api from '../../lib/api';

const PRESET_COLORS = [
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
  '#0D9488', // Teal
  '#EAB308', // Yellow
  '#3B82F6', // Blue
];

type BudgetSortKey = 'plannedAmount' | 'actualExpense' | 'diff' | 'categoryName';
type SortOrder = 'asc' | 'desc';

export default function BudgetsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { 
    month, 
    year, 
    refreshData, 
    categories: allCategories,
    getCachedBudgets,
    setCachedBudgets
  } = useFinance();

  const [budgetData, setBudgetData] = useState<any>(() => {
    return getCachedBudgets(month, year) || {
      summary: { totalPlannedBudget: 0, totalActualExpense: 0, totalRemainingDiff: 0 },
      categories: []
    };
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set Budget Modal State
  const [editingCategory, setEditingCategory] = useState<BudgetCategoryItem | null>(null);

  // Sorting and Filtering State
  const [sortBy, setSortBy] = useState<BudgetSortKey>('plannedAmount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Add Custom Budget Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [mode, setMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [selectedExistingCategoryId, setSelectedExistingCategoryId] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customPlannedAmount, setCustomPlannedAmount] = useState('');
  const [customColor, setCustomColor] = useState('#10B981');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadBudgets = async (forceRefresh = false) => {
    if (!user) return;

    const cached = getCachedBudgets(month, year);
    if (cached && !forceRefresh) {
      setBudgetData(cached);
      return;
    }

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get(`/budgets?month=${month}&year=${year}`);
      setBudgetData(res.data);
      setCachedBudgets(res.data, month, year);
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const cached = getCachedBudgets(month, year);
    if (cached) {
      setBudgetData(cached);
    } else {
      loadBudgets(false);
    }
  }, [user, month, year]);

  const handleDeleteBudgetItem = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Reset budget allocation for "${categoryName}" to 0?`)) return;
    try {
      await api.delete(`/budgets/items/${categoryId}?month=${month}&year=${year}`);
      await loadBudgets(true);
      refreshData();
    } catch (err) {
      console.error('Failed to remove budget item:', err);
    }
  };

  const handleToggleSort = (key: BudgetSortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder(key === 'categoryName' ? 'asc' : 'desc');
    }
  };

  // Filtered and Sorted Categories
  const filteredAndSortedCategories = useMemo(() => {
    const list = (budgetData?.categories || []).filter((cat: any) => {
      if (!searchTerm.trim()) return true;
      return cat.categoryName.toLowerCase().includes(searchTerm.trim().toLowerCase());
    });

    return [...list].sort((a: any, b: any) => {
      const valA = a[sortBy];
      const valB = b[sortBy];

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortOrder === 'asc'
        ? (valA ?? 0) - (valB ?? 0)
        : (valB ?? 0) - (valA ?? 0);
    });
  }, [budgetData?.categories, searchTerm, sortBy, sortOrder]);

  const handleCreateCustomBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const planned = parseFloat(customPlannedAmount.replace(/,/g, ''));
    if (isNaN(planned) || planned < 0) return;

    setAddLoading(true);
    try {
      if (mode === 'NEW') {
        if (!customCategoryName.trim()) return;
        await api.post('/budgets/custom', {
          month,
          year,
          categoryName: customCategoryName.trim(),
          color: customColor,
          icon: 'Tag',
          plannedAmount: planned
        });
      } else {
        if (!selectedExistingCategoryId) return;
        await api.post('/budgets/items', {
          month,
          year,
          categoryId: selectedExistingCategoryId,
          plannedAmount: planned
        });
      }

      setIsAddModalOpen(false);
      setCustomCategoryName('');
      setCustomPlannedAmount('');
      setSelectedExistingCategoryId('');
      await loadBudgets(true);
      refreshData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add custom budget.');
    } finally {
      setAddLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Authenticating session..." theme="indigo" />
      </div>
    );
  }

  const currentMonthName = MONTHS.find((m) => m.value === month)?.label || 'Month';
  const existingCategories = allCategories.filter((c) => c.type === 'EXPENSE');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Header with Action Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <PieChartIcon className="w-4 h-4" />
            <span>Budget Planner</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Budgets
          </h1>
          <div className="flex items-center space-x-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{currentMonthName} {year}</span>
            <InfoTooltip content="Allocate planned spending limits and track real-time variance directly per category." />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadBudgets(true)}
            disabled={isRefreshing || loading}
            title="Refresh budget allocations"
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={() => {
              setMode('NEW');
              setIsAddModalOpen(true);
            }}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Budget</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Planned Budget</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {formatMMK(budgetData.summary.totalPlannedBudget)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Actual Spent</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatMMK(budgetData.summary.totalActualExpense)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Remaining Left Budget</div>
          <div className={`text-2xl font-black mt-1 ${
            budgetData.summary.totalRemainingDiff >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatMMK(budgetData.summary.totalRemainingDiff)}
          </div>
        </div>
      </div>

      {/* Budget Matrix Table with Filter & Sort Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {/* Header Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Categories Breakdown &amp; Variance</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Showing {filteredAndSortedCategories.length} of {budgetData.categories.length} categories
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-56 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex-shrink-0">
              <div className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-400 dark:text-slate-500 font-normal">Sort:</span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-') as [BudgetSortKey, SortOrder];
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="bg-transparent focus:outline-none cursor-pointer pr-1 text-slate-800 dark:text-slate-200 font-bold"
                >
                  <option value="plannedAmount-desc" className="dark:bg-slate-800">Budget: Highest first</option>
                  <option value="plannedAmount-asc" className="dark:bg-slate-800">Budget: Lowest first</option>
                  <option value="actualExpense-desc" className="dark:bg-slate-800">Spent: Highest first</option>
                  <option value="actualExpense-asc" className="dark:bg-slate-800">Spent: Lowest first</option>
                  <option value="diff-asc" className="dark:bg-slate-800">Remaining: Lowest / Exceeded</option>
                  <option value="diff-desc" className="dark:bg-slate-800">Remaining: Highest left</option>
                  <option value="categoryName-asc" className="dark:bg-slate-800">Category: A → Z</option>
                  <option value="categoryName-desc" className="dark:bg-slate-800">Category: Z → A</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading && budgetData.categories.length === 0 ? (
          <div className="py-12 flex justify-center">
            <ProgressLoading message="Syncing budget allocations & variance..." theme="indigo" />
          </div>
        ) : budgetData.categories.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <PieChartIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-base font-semibold text-slate-600 dark:text-slate-300">No budget allocations found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click &apos;Add Custom Budget&apos; to set up your first planned limit.</p>
          </div>
        ) : filteredAndSortedCategories.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No matching categories</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Try clearing your search query &quot;{searchTerm}&quot;</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {/* Category Column Header */}
                    <th
                      onClick={() => handleToggleSort('categoryName')}
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors select-none"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Category</span>
                        {sortBy === 'categoryName' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Planned Amount Column Header */}
                    <th
                      onClick={() => handleToggleSort('plannedAmount')}
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors select-none"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Planned Budget</span>
                        {sortBy === 'plannedAmount' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Actual Expense Column Header */}
                    <th
                      onClick={() => handleToggleSort('actualExpense')}
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors select-none"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Actual Expense</span>
                        {sortBy === 'actualExpense' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </th>

                    {/* Diff Column Header */}
                    <th
                      onClick={() => handleToggleSort('diff')}
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors select-none"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Diff (Remaining)</span>
                        {sortBy === 'diff' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </th>

                    <th className="px-6 py-3.5">Usage &amp; Progress</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAndSortedCategories.map((cat: any) => {
                    const isOverBudget = cat.actualExpense > cat.plannedAmount && cat.plannedAmount > 0;
                    return (
                      <tr key={cat.categoryId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Category Name */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: cat.color || '#10b981' }}
                            ></span>
                            <span>{cat.categoryName}</span>
                          </div>
                        </td>

                        {/* Planned Amount (Click to open modal) */}
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => setEditingCategory(cat)}
                            className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center space-x-1.5 group text-left"
                            title="Click to set or adjust budget limit"
                          >
                            <span>{formatMMK(cat.plannedAmount)}</span>
                            <span className="p-1 rounded-md text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 transition-colors">
                              <Edit2 className="w-3 h-3" />
                            </span>
                          </button>
                        </td>

                        {/* Total Actual Expense */}
                        <td className="px-6 py-4 font-bold text-rose-600 dark:text-rose-400">
                          {formatMMK(cat.actualExpense)}
                        </td>

                        {/* Diff (Planned - Actual) */}
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            cat.diff >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}>
                            {formatMMK(cat.diff)}
                          </span>
                        </td>

                        {/* Progress Bar & Percentage */}
                        <td className="px-6 py-4 w-48">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <span>{cat.percentageUsed}%</span>
                              {isOverBudget && (
                                <span className="text-rose-600 dark:text-rose-400 text-[10px] font-bold flex items-center space-x-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Over</span>
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  isOverBudget
                                    ? 'bg-rose-500'
                                    : cat.percentageUsed > 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(cat.percentageUsed, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Action Column */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setEditingCategory(cat)}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 dark:hover:bg-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg transition-colors inline-flex items-center space-x-1"
                              title="Set or adjust budget limit"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{cat.plannedAmount > 0 ? 'Adjust' : 'Set Limit'}</span>
                            </button>
                            {cat.plannedAmount > 0 && (
                              <button
                                onClick={() => handleDeleteBudgetItem(cat.categoryId, cat.categoryName)}
                                title="Reset allocation to 0"
                                className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAndSortedCategories.map((cat: any) => {
                const isOverBudget = cat.actualExpense > cat.plannedAmount && cat.plannedAmount > 0;
                return (
                  <div key={cat.categoryId} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color || '#10b981' }}
                        ></span>
                        <span className="text-sm">{cat.categoryName}</span>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        cat.diff >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                      }`}>
                        {formatMMK(cat.diff)} left
                      </span>
                    </div>

                    {/* Numbers: Planned vs Actual */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Planned Budget</div>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(cat)}
                          className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mt-0.5 text-left"
                        >
                          <span>{formatMMK(cat.plannedAmount)}</span>
                          <Edit2 className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Actual Spent</div>
                        <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">{formatMMK(cat.actualExpense)}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>{cat.percentageUsed}% spent</span>
                        {isOverBudget && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center space-x-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Exceeded Limit</span>
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isOverBudget
                              ? 'bg-rose-500'
                              : cat.percentageUsed > 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(cat.percentageUsed, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setEditingCategory(cat)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 dark:hover:bg-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg transition-colors inline-flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{cat.plannedAmount > 0 ? 'Adjust' : 'Set Limit'}</span>
                      </button>
                      {cat.plannedAmount > 0 && (
                        <button
                          onClick={() => handleDeleteBudgetItem(cat.categoryId, cat.categoryName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Reset allocation to 0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Set Category Budget Modal */}
      <SetBudgetModal
        category={editingCategory}
        isOpen={!!editingCategory}
        month={month}
        year={year}
        onClose={() => setEditingCategory(null)}
        onSuccess={() => {
          loadBudgets(true);
          refreshData();
        }}
      />

      {/* Add Custom Budget Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/30">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <PieChartIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Add Custom Budget</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{currentMonthName} {year} Allocation</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomBudget} className="p-6 space-y-4">
              {/* Mode Toggle: New Category vs Existing Category */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setMode('NEW')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    mode === 'NEW' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Create New Category
                </button>
                <button
                  type="button"
                  onClick={() => setMode('EXISTING')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    mode === 'EXISTING' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Choose Existing
                </button>
              </div>

              {mode === 'NEW' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Budget Category Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Car Maintenance, Gym, Vacation, Emergency..."
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      required
                      className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  {/* Color Swatch Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Category Tag Color
                    </label>
                    <div className="flex items-center space-x-2">
                      {PRESET_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setCustomColor(col)}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            customColor === col ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Select Existing Category
                  </label>
                  <select
                    value={selectedExistingCategoryId}
                    onChange={(e) => setSelectedExistingCategoryId(e.target.value)}
                    required
                    className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100"
                  >
                    <option value="" className="dark:bg-slate-800">-- Choose Category --</option>
                    {existingCategories.map((c) => (
                      <option key={c.id} value={c.id} className="dark:bg-slate-800">{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Planned Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Monthly Planned Amount (MMK)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  value={customPlannedAmount}
                  onChange={(e) => setCustomPlannedAmount(e.target.value)}
                  required
                  min={1}
                  className="w-full text-xl font-bold text-slate-900 dark:text-slate-100 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
                {customPlannedAmount && Number(customPlannedAmount) > 0 && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                    {formatMMK(Number(customPlannedAmount))}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {addLoading ? 'Adding...' : 'Add Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
