'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinancialContext';
import api from '../lib/api';
import { formatMMK } from '../lib/utils';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { month, year, accounts, refreshData } = useFinance();
  const [source, setSource] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isReceivedInstantly, setIsReceivedInstantly] = useState(false);
  const [targetAccountId, setTargetAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (accounts.length > 0 && !targetAccountId) setTargetAccountId(accounts[0].id);
  }, [accounts.length]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(expectedAmount.replace(/,/g, ''));
    if (!amount || amount <= 0) {
      setError('Please enter a valid income amount.');
      return;
    }
    if (!source.trim()) {
      setError('Please enter an income source name.');
      return;
    }

    setLoading(true);
    try {
      const planRes = await api.post('/incomes', {
        source: source.trim(),
        expectedAmount: amount,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
        month,
        year,
        description: description.trim() || null,
      });

      if (isReceivedInstantly && targetAccountId) {
        await api.post(`/incomes/${planRes.data.id}/receive`, {
          accountId: targetAccountId,
          actualAmount: amount,
          actualDate: new Date(expectedDate).toISOString(),
        });
      }

      onClose();
      setSource('');
      setExpectedAmount('');
      setDescription('');
      setIsReceivedInstantly(false);
      if (onSuccess) onSuccess();
      refreshData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save income. Please try again.');
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Income</h3>
              <p className="text-xs text-slate-500">Plan an expected payout or record a deposit</p>
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

          {/* Source */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Income Source
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly Salary, Freelance Project, Rental Income..."
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
              className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Expected Amount (MMK)
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                required
                min={1}
                className="w-full text-2xl font-bold text-slate-900 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none focus:bg-white transition-all"
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">Kyat</span>
            </div>
            {expectedAmount && Number(expectedAmount) > 0 && (
              <p className="text-xs text-slate-500 mt-1 pl-1">
                <span className="font-semibold text-emerald-600">{formatMMK(Number(expectedAmount))}</span>
              </p>
            )}
          </div>

          {/* Expected Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Expected Date
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Already received toggle */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <label className="flex items-center space-x-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isReceivedInstantly}
                onChange={(e) => setIsReceivedInstantly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-700">Mark as already received</p>
                <p className="text-xs text-slate-400">Immediately deposits this amount into your account</p>
              </div>
            </label>

            {isReceivedInstantly && (
              <div className="px-4 py-3 border-t border-slate-200 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Deposit Into Account
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full text-sm font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatMMK(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Q3 bonus payment, invoice #123..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading
                ? <span>Saving...</span>
                : <><TrendingUp className="w-4 h-4" /><span>Save Income</span></>
              }
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
