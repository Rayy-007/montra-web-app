'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt, AlertCircle, CheckCircle } from 'lucide-react';
import { useFinance } from '../context/FinancialContext';
import api from '../lib/api';
import { formatMMK } from '../lib/utils';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { accounts, categories, refreshData } = useFinance();
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  React.useEffect(() => {
    if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
    if (expenseCategories.length > 0 && !categoryId) setCategoryId(expenseCategories[0].id);
  }, [accounts, expenseCategories.length]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }
    if (!accountId) {
      setError('Please select an account to debit from.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/transactions', {
        accountId,
        categoryId: categoryId || null,
        type: 'EXPENSE',
        amount: parsedAmount,
        date: new Date(date).toISOString(),
        description: description.trim() || null,
      });

      onClose();
      setAmount('');
      setDescription('');
      if (onSuccess) onSuccess();
      refreshData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Expense</h3>
              <p className="text-xs text-slate-500">Record a payment or purchase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount (MMK)
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min={1}
                className="w-full text-2xl font-bold text-slate-900 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none focus:bg-white transition-all"
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">Kyat</span>
            </div>
            {amount && Number(amount) > 0 && (
              <p className="text-xs text-slate-500 mt-1 pl-1">
                <span className="font-semibold text-rose-600">{formatMMK(Number(amount))}</span>
              </p>
            )}
          </div>

          {/* Category & Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Pay From
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Grocery shopping, petrol, monthly bill..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading
                ? <span>Recording...</span>
                : <><Receipt className="w-4 h-4" /><span>Save Expense</span></>
              }
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
