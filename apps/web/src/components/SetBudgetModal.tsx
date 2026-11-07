'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PieChart, AlertCircle, Check, RotateCcw, TrendingUp } from 'lucide-react';
import { formatMMK, formatNumber, MONTHS } from '../lib/utils';
import api from '../lib/api';

export interface BudgetCategoryItem {
  categoryId: string;
  categoryName: string;
  color?: string;
  icon?: string;
  plannedAmount: number;
  actualExpense: number;
  diff: number;
  percentageUsed: number;
}

interface SetBudgetModalProps {
  category: BudgetCategoryItem | null;
  isOpen: boolean;
  month: number;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({
  category,
  isOpen,
  month,
  year,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setAmount(category.plannedAmount > 0 ? String(category.plannedAmount) : '');
      setError(null);
    }
  }, [category, isOpen]);

  if (!isOpen || !category || typeof document === 'undefined') return null;

  const currentMonthName = MONTHS.find((m) => m.value === month)?.label || 'Month';
  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const isBelowCurrentSpent = numericAmount > 0 && numericAmount < category.actualExpense;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount < 0) {
      setError('Budget amount cannot be negative');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/budgets/items', {
        month,
        year,
        categoryId: category.categoryId,
        plannedAmount: numericAmount,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update category budget limit.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToZero = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/budgets/items/${category.categoryId}?month=${month}&year=${year}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset budget allocation.');
    } finally {
      setLoading(false);
    }
  };

  const addPreset = (val: number) => {
    const cur = parseFloat(amount.replace(/,/g, '')) || 0;
    setAmount(String(cur + val));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/30">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: (category.color || '#6366F1') + '20', color: category.color || '#6366F1' }}
            >
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>Set Budget Amount</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{category.categoryName}</span> • {currentMonthName} {year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Spending Stats Pill */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Current Spent</span>
              <p className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {formatMMK(category.actualExpense)}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Current Limit</span>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">
                {formatMMK(category.plannedAmount)}
              </p>
            </div>
          </div>

          {/* Budget Limit Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Monthly Planned Limit (MMK)
              </label>
              {category.actualExpense > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(category.actualExpense))}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                >
                  Match Spent
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
                className="w-full text-2xl font-black text-slate-900 dark:text-slate-100 px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
              />
            </div>
            {numericAmount > 0 && (
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1.5 flex items-center space-x-1">
                <span>{formatMMK(numericAmount)}</span>
              </p>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Quick Add / Adjust
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[50000, 100000, 200000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => addPreset(val)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700/60"
                >
                  +{formatNumber(val)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount('0')}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
              >
                Clear (0)
              </button>
            </div>
          </div>

          {/* Warning if planned is lower than already spent */}
          {isBelowCurrentSpent && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                <strong>Note:</strong> You have already spent {formatMMK(category.actualExpense)} in this category. Setting the budget to {formatMMK(numericAmount)} will mark it as exceeded.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {category.plannedAmount > 0 ? (
              <button
                type="button"
                onClick={handleResetToZero}
                disabled={loading}
                title="Reset allocation to 0"
                className="py-2.5 px-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors disabled:opacity-50 flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Budget</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

