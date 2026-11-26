'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  Users,
  ShieldAlert,
  PiggyBank,
  Check,
  Info,
} from 'lucide-react';
import { useFinance } from '../context/FinancialContext';
import { formatMMK, toLocalDateTimeInput } from '../lib/utils';
import api from '../lib/api';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultFromId?: string;
  defaultToId?: string;
}

const TRANSFER_TAGS = [
  { id: 'TOP_UP', label: 'Top Up Wallet', icon: ArrowLeftRight, desc: 'Move money between wallets' },
  { id: 'CASH_WITHDRAWAL', label: 'Get Cash', icon: Banknote, desc: 'Take cash out from KPay or Bank' },
  { id: 'FAMILY_EXCHANGE', label: 'Family Swap', icon: Users, desc: 'Gave KPay/KBZ, got cash back' },
  { id: 'RESERVE_DRAW', label: 'Extra Bank Top-Up', icon: ShieldAlert, desc: 'Took extra money from Main Bank' },
  { id: 'SAVINGS_CONTRIBUTION', label: 'Put Into Savings', icon: PiggyBank, desc: 'Move money to savings wallet' },
];

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultFromId,
  defaultToId,
}) => {
  const { accounts, refreshData } = useFinance();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [transferTag, setTransferTag] = useState('TOP_UP');
  const [date, setDate] = useState(() => toLocalDateTimeInput());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || accounts.length < 2) return;
    const initialFrom = defaultFromId || accounts[0]?.id || '';
    const initialTo =
      defaultToId || accounts.find((a) => a.id !== initialFrom)?.id || '';
    setFromAccountId(initialFrom);
    setToAccountId(initialTo);
    setAmount('');
    setDescription('');
    setError('');
    setDate(toLocalDateTimeInput());
  }, [isOpen, accounts, defaultFromId, defaultToId]);

  useEffect(() => {
    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);
    if (!fromAcc || !toAcc) return;

    if (fromAcc.role === 'RESERVE' && toAcc.role === 'DAILY_SPENDING') {
      if (toAcc.type === 'CASH') {
        setTransferTag('CASH_WITHDRAWAL');
      } else {
        setTransferTag('RESERVE_DRAW');
      }
    } else if (toAcc.type === 'CASH') {
      setTransferTag('CASH_WITHDRAWAL');
    } else if (toAcc.role === 'SAVINGS_HOLDING' || toAcc.type === 'SAVINGS') {
      setTransferTag('SAVINGS_CONTRIBUTION');
    }
  }, [fromAccountId, toAccountId, accounts]);

  if (!isOpen) return null;

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const isBankTopUp =
    transferTag === 'RESERVE_DRAW' ||
    (fromAccount?.role === 'RESERVE' && toAccount?.role === 'DAILY_SPENDING');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fromAccountId || !toAccountId) {
      setError('Please select both From and To wallets.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setError('From and To wallets must be different.');
      return;
    }
    if (parsedAmount <= 0) {
      setError('Please enter an amount greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const selectedTagObj = TRANSFER_TAGS.find((t) => t.id === transferTag);
      await api.post('/transactions', {
        accountId: fromAccountId,
        toAccountId,
        type: 'TRANSFER',
        transferTag,
        amount: parsedAmount,
        date: new Date(date).toISOString(),
        description:
          description.trim() ||
          `${selectedTagObj?.label || 'Transfer'}: ${fromAccount?.name} → ${toAccount?.name}`,
      });

      await refreshData();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save transfer.');
    } finally {
      setLoading(false);
    }
  };

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) onClose();
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto animate-modal-slide">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-sky-50/70 dark:bg-sky-950/30">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Move Money Between Wallets
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cash, KPay, KBZ Bank, or AYA Bank
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {accounts.length < 2 ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  You need at least 2 wallets (for example KPay and Cash) to move money between them.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {error}
                  </div>
                )}

                {/* From -> To Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2.5 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      From Wallet
                    </label>
                    <select
                      value={fromAccountId}
                      onChange={(e) => setFromAccountId(e.target.value)}
                      className="w-full text-sm font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id} className="dark:bg-slate-900">
                          {acc.name} ({formatMMK(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const prevFrom = fromAccountId;
                      setFromAccountId(toAccountId);
                      setToAccountId(prevFrom);
                    }}
                    title="Swap wallets"
                    className="hidden sm:flex items-center justify-center w-9 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-slate-500 hover:text-sky-600 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      To Wallet
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="w-full text-sm font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id} className="dark:bg-slate-900">
                          {acc.name} ({formatMMK(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Amount with live comma preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Amount (MMK)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      min="1"
                      className="w-full text-2xl font-black px-3.5 py-2.5 pr-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                      Kyat
                    </span>
                  </div>
                  {parsedAmount > 0 && (
                    <div className="mt-1.5 space-y-1 px-0.5">
                      <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
                        {formatMMK(parsedAmount)}
                      </p>
                      {fromAccount && toAccount && (
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            {fromAccount.name} after: {formatMMK(fromAccount.balance - parsedAmount)}
                          </span>
                          <span>
                            {toAccount.name} after: {formatMMK(toAccount.balance + parsedAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Purpose / Quick Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Why Are You Moving This?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TRANSFER_TAGS.map((tag) => {
                      const TagIcon = tag.icon;
                      const active = transferTag === tag.id;
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => setTransferTag(tag.id)}
                          className={`p-2 rounded-xl border text-left transition-all flex items-center space-x-2 ${
                            active
                              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30'
                              : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <TagIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-[11px] font-semibold leading-tight">{tag.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isBankTopUp && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      <strong>Bank Top-Up Notice:</strong> Moving money from Main Bank ({fromAccount?.name}) to Daily Use ({toAccount?.name}). Dashboard and Budgets will show this extra money taken from bank so you stay on track.
                    </span>
                  </div>
                )}

                {/* Date & Optional Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mom needed KPay"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Simple accounting note */}
                <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <Info className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  <span>This only moves money between your wallets. It is NOT counted as an Expense or Income.</span>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Transfer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )
    : null;
};
