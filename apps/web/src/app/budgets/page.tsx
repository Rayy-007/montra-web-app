'use client';

import React, { useState, useEffect } from 'react';
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
  Tag 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { formatMMK, formatNumber, MONTHS } from '../../lib/utils';
import { ProgressLoading } from '../../components/ProgressLoading';
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

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

  const handleStartEdit = (cat: any) => {
    setEditingCategoryId(cat.categoryId);
    setEditValue(String(cat.plannedAmount || ''));
  };

  const handleSaveBudget = async (categoryId: string) => {
    const amount = parseFloat(editValue.replace(/,/g, ''));
    if (isNaN(amount) || amount < 0) return;

    setSaving(true);
    try {
      await api.post('/budgets/items', {
        month,
        year,
        categoryId,
        plannedAmount: amount
      });

      setEditingCategoryId(null);
      await loadBudgets();
      refreshData();
    } catch (err) {
      console.error('Failed to update category budget:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudgetItem = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Reset budget allocation for "${categoryName}" to 0?`)) return;
    try {
      await api.delete(`/budgets/items/${categoryId}?month=${month}&year=${year}`);
      await loadBudgets();
      refreshData();
    } catch (err) {
      console.error('Failed to remove budget item:', err);
    }
  };

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
      await loadBudgets();
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

  // Categories available for allocation
  const existingCategories = allCategories.filter(c => c.type === 'EXPENSE');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Header with Action Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider">
            <PieChartIcon className="w-4 h-4" />
            <span>Monthly Budget &amp; Spending Variance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {currentMonthName} {year} Budget Planner
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Allocate planned spending limits and track real-time variance directly per category.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadBudgets(true)}
            disabled={isRefreshing || loading}
            title="Refresh budget allocations"
            className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-indigo-600 rounded-xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
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
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Planned Budget</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatMMK(budgetData.summary.totalPlannedBudget)}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Actual Spent</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {formatMMK(budgetData.summary.totalActualExpense)}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining Left Budget</div>
          <div className={`text-2xl font-black mt-1 ${
            budgetData.summary.totalRemainingDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {formatMMK(budgetData.summary.totalRemainingDiff)}
          </div>
        </div>
      </div>

      {/* Budget Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Categories Breakdown &amp; Variance</h2>
          <span className="text-xs text-slate-400">Click planned amount to edit</span>
        </div>

        {loading && budgetData.categories.length === 0 ? (
          <div className="py-12 flex justify-center">
            <ProgressLoading message="Syncing budget allocations & variance..." theme="indigo" />
          </div>
        ) : budgetData.categories.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <PieChartIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-base font-semibold text-slate-600">No budget allocations found</p>
            <p className="text-xs text-slate-400 mt-1">Click &apos;Add Custom Budget&apos; to set up your first planned limit.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Planned Amount</th>
                    <th className="px-6 py-3.5">Actual Expense</th>
                    <th className="px-6 py-3.5">Diff (Remaining)</th>
                    <th className="px-6 py-3.5">Usage &amp; Progress</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetData.categories.map((cat: any) => {
                    const isEditing = editingCategoryId === cat.categoryId;
                    const isOverBudget = cat.actualExpense > cat.plannedAmount && cat.plannedAmount > 0;
                    return (
                      <tr key={cat.categoryId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 flex items-center space-x-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: cat.color || '#10b981' }}
                            ></span>
                            <span>{cat.categoryName}</span>
                          </div>
                        </td>

                        {/* Planned Amount (Editable) */}
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveBudget(cat.categoryId);
                                  if (e.key === 'Escape') setEditingCategoryId(null);
                                }}
                                className="w-28 text-xs font-bold px-2 py-1 bg-white border border-emerald-400 rounded-lg focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveBudget(cat.categoryId)}
                                disabled={saving}
                                className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleStartEdit(cat)}
                              className="font-bold text-slate-800 cursor-pointer hover:text-emerald-600 transition-colors flex items-center space-x-1.5"
                            >
                              <span>{formatMMK(cat.plannedAmount)}</span>
                              <Edit2 className="w-3 h-3 text-slate-300" />
                            </div>
                          )}
                        </td>

                        {/* Total Actual Expense */}
                        <td className="px-6 py-4 font-bold text-rose-600">
                          {formatMMK(cat.actualExpense)}
                        </td>

                        {/* Diff (Planned - Actual) */}
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            cat.diff >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {formatMMK(cat.diff)}
                          </span>
                        </td>

                        {/* Progress Bar & Percentage */}
                        <td className="px-6 py-4 w-48">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>{cat.percentageUsed}%</span>
                              {isOverBudget && (
                                <span className="text-rose-600 text-[10px] font-bold flex items-center space-x-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Over</span>
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleStartEdit(cat)}
                              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                              Adjust
                            </button>
                            {cat.plannedAmount > 0 && (
                              <button
                                onClick={() => handleDeleteBudgetItem(cat.categoryId, cat.categoryName)}
                                title="Reset allocation to 0"
                                className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
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
            <div className="md:hidden divide-y divide-slate-100">
              {budgetData.categories.map((cat: any) => {
                const isEditing = editingCategoryId === cat.categoryId;
                const isOverBudget = cat.actualExpense > cat.plannedAmount && cat.plannedAmount > 0;
                return (
                  <div key={cat.categoryId} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color || '#10b981' }}
                        ></span>
                        <span className="text-sm">{cat.categoryName}</span>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        cat.diff >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {formatMMK(cat.diff)} left
                      </span>
                    </div>

                    {/* Numbers: Planned vs Actual */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400">Planned Budget</div>
                        {isEditing ? (
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 text-xs font-bold px-1.5 py-0.5 bg-white border border-emerald-400 rounded focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveBudget(cat.categoryId)}
                              disabled={saving}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(cat)}
                            className="text-xs font-bold text-slate-800 flex items-center space-x-1 cursor-pointer"
                          >
                            <span>{formatMMK(cat.plannedAmount)}</span>
                            <Edit2 className="w-3 h-3 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400">Actual Spent</div>
                        <div className="text-xs font-bold text-rose-600 mt-0.5">{formatMMK(cat.actualExpense)}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                        <span>{cat.percentageUsed}% spent</span>
                        {isOverBudget && (
                          <span className="text-rose-600 font-bold flex items-center space-x-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Exceeded Limit</span>
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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
                    <div className="flex items-center justify-end space-x-3 pt-1">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Adjust Limit
                      </button>
                      {cat.plannedAmount > 0 && (
                        <button
                          onClick={() => handleDeleteBudgetItem(cat.categoryId, cat.categoryName)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
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

      {/* Add Custom Budget Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-indigo-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <PieChartIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Custom Budget</h3>
                  <p className="text-xs text-slate-500">{currentMonthName} {year} Allocation</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomBudget} className="p-6 space-y-4">
              {/* Mode Toggle: New Category vs Existing Category */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setMode('NEW')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    mode === 'NEW' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  Create New Category
                </button>
                <button
                  type="button"
                  onClick={() => setMode('EXISTING')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    mode === 'EXISTING' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  Choose Existing
                </button>
              </div>

              {mode === 'NEW' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Budget Category Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Car Maintenance, Gym, Vacation, Emergency..."
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      required
                      className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Color Swatch Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select Existing Category
                  </label>
                  <select
                    value={selectedExistingCategoryId}
                    onChange={(e) => setSelectedExistingCategoryId(e.target.value)}
                    required
                    className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Choose Category --</option>
                    {existingCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Planned Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Monthly Planned Amount (MMK)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  value={customPlannedAmount}
                  onChange={(e) => setCustomPlannedAmount(e.target.value)}
                  required
                  min={1}
                  className="w-full text-xl font-bold text-slate-900 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {customPlannedAmount && Number(customPlannedAmount) > 0 && (
                  <p className="text-xs text-indigo-600 font-semibold mt-1">
                    {formatMMK(Number(customPlannedAmount))}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
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
