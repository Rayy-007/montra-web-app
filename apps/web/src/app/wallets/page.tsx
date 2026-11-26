'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Plus,
  Trash2,
  Smartphone,
  Banknote,
  Landmark,
  PiggyBank,
  X,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Edit2,
  RotateCcw,
  Check,
  AlertTriangle,
  ArrowLeftRight,
  Sparkles,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { formatMMK, MONTHS } from '../../lib/utils';
import { ProgressLoading } from '../../components/ProgressLoading';
import { InfoTooltip } from '../../components/InfoTooltip';
import { TransferModal } from '../../components/TransferModal';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import api from '../../lib/api';

export default function WalletsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { accounts, monthlyAccounts, month, year, refreshData, loading: financeLoading } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<'CASH' | 'MOBILE_WALLET' | 'BANK' | 'SAVINGS'>('MOBILE_WALLET');
  const [walletRole, setWalletRole] = useState<'DAILY_SPENDING' | 'RESERVE' | 'SAVINGS_HOLDING'>('DAILY_SPENDING');
  const [initialBalance, setInitialBalance] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [creatingWalletName, setCreatingWalletName] = useState<string | null>(null);

  // Transfers list & loading state
  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [deletingTransfer, setDeletingTransfer] = useState<any | null>(null);
  const [isDeletingTransfer, setIsDeletingTransfer] = useState(false);
  const [deleteTransferError, setDeleteTransferError] = useState<string | null>(null);

  // Edit Wallet State
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'CASH' | 'MOBILE_WALLET' | 'BANK' | 'SAVINGS'>('MOBILE_WALLET');
  const [editRole, setEditRole] = useState<'DAILY_SPENDING' | 'RESERVE' | 'SAVINGS_HOLDING'>('DAILY_SPENDING');
  const [editBalance, setEditBalance] = useState('');
  const [editBudgetLimit, setEditBudgetLimit] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Custom Delete Modal State
  const [deletingAccount, setDeletingAccount] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Custom Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadTransfers = async () => {
    if (!user) return;
    setTransfersLoading(true);
    try {
      const res = await api.get(`/transactions?month=${month}&year=${year}&type=TRANSFER`);
      setRecentTransfers(res.data || []);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setTransfersLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadTransfers();
  }, [user, month, year]);

  const handleDeleteTransfer = (transfer: any) => {
    setDeleteTransferError(null);
    setDeletingTransfer(transfer);
  };

  const handleConfirmDeleteTransfer = async () => {
    if (!deletingTransfer) return;
    setIsDeletingTransfer(true);
    setDeleteTransferError(null);
    try {
      await api.delete(`/transactions/${deletingTransfer.id}`);
      setDeletingTransfer(null);
      await Promise.all([refreshData(), loadTransfers()]);
    } catch (err: any) {
      setDeleteTransferError(err.response?.data?.message || 'Failed to delete transfer.');
    } finally {
      setIsDeletingTransfer(false);
    }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = walletName.trim();
    if (!trimmedName || creatingWalletName) return;

    const budgetValue = budgetLimit ? parseFloat(budgetLimit.replace(/,/g, '')) : null;
    const balanceValue = parseFloat(initialBalance.replace(/,/g, '')) || 0;
    const payload = {
      name: trimmedName,
      type: walletType,
      role: walletRole,
      balance: balanceValue,
      budgetLimit: budgetValue && budgetValue > 0 ? budgetValue : null,
      month,
      year,
    };

    // Close modal immediately and render a live skeleton card placeholder in the grid
    // so the user gets instant visual feedback while saving to the database.
    setIsAddModalOpen(false);
    setCreatingWalletName(trimmedName);
    setWalletName('');
    setInitialBalance('');
    setBudgetLimit('');

    try {
      await api.post('/accounts', payload);
      await refreshData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create wallet.');
    } finally {
      setCreatingWalletName(null);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteError(null);
    setDeletingAccount({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/accounts/${deletingAccount.id}`);
      setDeletingAccount(null);
      await Promise.all([refreshData(), loadTransfers()]);
    } catch (err: any) {
      console.error('Failed to delete wallet:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete wallet. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (acc: any) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditType(acc.type);
    setEditRole(
      acc.role || (acc.type === 'BANK' ? 'RESERVE' : acc.type === 'SAVINGS' ? 'SAVINGS_HOLDING' : 'DAILY_SPENDING')
    );
    setEditBalance(String(acc.startingBalance ?? acc.balance ?? 0));
    setEditBudgetLimit(acc.budgetLimit ? String(acc.budgetLimit) : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName.trim()) return;

    setEditLoading(true);
    try {
      const budgetValue = editBudgetLimit.trim() ? parseFloat(editBudgetLimit.replace(/,/g, '')) : null;
      const parsedBalance = parseFloat(editBalance.replace(/,/g, '')) || 0;

      await api.put(`/accounts/${editingAccount.id}`, {
        name: editName.trim(),
        type: editType,
        role: editRole,
        balance: parsedBalance,
        budgetLimit: budgetValue && budgetValue > 0 ? budgetValue : null,
        month,
        year,
      });

      setEditingAccount(null);
      await refreshData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update wallet.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmResetAll = async () => {
    setIsResettingAll(true);
    try {
      await api.post(`/accounts/reset?month=${month}&year=${year}`);
      setIsResetModalOpen(false);
      await refreshData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reset wallet balances.');
    } finally {
      setIsResettingAll(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Loading your account..." theme="teal" />
      </div>
    );
  }

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'MOBILE_WALLET':
        return Smartphone;
      case 'BANK':
        return Landmark;
      case 'SAVINGS':
        return PiggyBank;
      default:
        return Banknote;
    }
  };

  const getWalletGradient = (type: string) => {
    switch (type) {
      case 'MOBILE_WALLET':
        return 'from-violet-500 to-purple-600';
      case 'BANK':
        return 'from-blue-500 to-indigo-600';
      case 'SAVINGS':
        return 'from-amber-500 to-orange-600';
      default:
        return 'from-emerald-500 to-teal-600';
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'RESERVE') return 'Main Bank';
    if (role === 'SAVINGS_HOLDING') return 'For Savings';
    return 'Daily Use';
  };

  const formatTransferTagLabel = (tag?: string | null) => {
    switch (tag) {
      case 'CASH_WITHDRAWAL':
        return 'Get Cash';
      case 'FAMILY_EXCHANGE':
        return 'Family Swap';
      case 'RESERVE_DRAW':
        return 'Extra Bank Top-Up';
      case 'SAVINGS_CONTRIBUTION':
        return 'Put Into Savings';
      case 'TOP_UP':
        return 'Top Up Wallet';
      default:
        return 'Transfer';
    }
  };

  const monthLabel = MONTHS.find((m) => m.value === month)?.label || '';

  const displayAccounts = (monthlyAccounts.length > 0 ? monthlyAccounts : accounts).map((acc) => {
    const monthly = monthlyAccounts.find((m) => m.id === acc.id);
    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      role:
        acc.role ||
        monthly?.role ||
        (acc.type === 'BANK' ? 'RESERVE' : acc.type === 'SAVINGS' ? 'SAVINGS_HOLDING' : 'DAILY_SPENDING'),
      startingBalance:
        acc.startingBalance !== undefined
          ? Number(acc.startingBalance)
          : monthly?.startingBalance !== undefined
          ? Number(monthly.startingBalance)
          : undefined,
      isCarriedOver: acc.isCarriedOver ?? monthly?.isCarriedOver ?? false,
      balance: Number(acc.balance) || 0,
      earmarkedSavings: Number(acc.earmarkedSavings ?? monthly?.earmarkedSavings ?? 0),
      availableBalance: Number(acc.availableBalance ?? monthly?.availableBalance ?? acc.balance ?? 0),
      budgetLimit: acc.budgetLimit ? Number(acc.budgetLimit) : null,
      monthlyIncome: monthly?.monthlyIncome ?? 0,
      monthlyExpense: monthly?.monthlyExpense ?? 0,
      monthlyTransfersIn: monthly?.monthlyTransfersIn ?? 0,
      monthlyTransfersOut: monthly?.monthlyTransfersOut ?? 0,
      monthlyNet: monthly?.monthlyNet ?? 0,
    };
  });

  const totalBalance = displayAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalMonthlyIncome = displayAccounts.reduce((sum, acc) => sum + acc.monthlyIncome, 0);
  const totalMonthlyExpense = displayAccounts.reduce((sum, acc) => sum + acc.monthlyExpense, 0);

  const parsedInitialBalance = parseFloat(initialBalance.replace(/,/g, '')) || 0;
  const parsedBudgetLimit = parseFloat(budgetLimit.replace(/,/g, '')) || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider">
            <Wallet className="w-4 h-4" />
            <span>Your Money Accounts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Wallets &amp; Accounts
          </h1>
          <div className="flex items-center space-x-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {monthLabel} {year}
            </span>
            <InfoTooltip content="Keep Cash, KPay, KBZ Bank, and AYA Bank organized. Balances carry forward automatically each month." />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            disabled={displayAccounts.length < 2}
            title="Move money between KPay, Cash, KBZ Bank, or AYA Bank"
            className="py-2.5 px-3.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-sky-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Move Money</span>
          </button>
          <button
            onClick={() => setIsResetModalOpen(true)}
            disabled={isResettingAll || displayAccounts.length === 0}
            title={`Set all wallet balances to 0 MMK for ${monthLabel} ${year}`}
            className="py-2.5 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isResettingAll ? 'animate-spin text-teal-600' : 'text-slate-500 dark:text-slate-400'}`} />
            <span className="hidden sm:inline">Reset Month</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={Boolean(creatingWalletName)}
            className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-teal-600/20 transition-all flex items-center space-x-2 disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>Add Wallet</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
            <Wallet className="w-3.5 h-3.5" />
            <span>Total Balance</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">{formatMMK(totalBalance)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium uppercase tracking-wider mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{monthLabel} Income</span>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatMMK(totalMonthlyIncome)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2 text-rose-500 dark:text-rose-400 text-xs font-medium uppercase tracking-wider mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{monthLabel} Expenses</span>
          </div>
          <div className="text-xl font-black text-rose-500 dark:text-rose-400">{formatMMK(totalMonthlyExpense)}</div>
        </div>
      </div>

      {/* Wallets Cards Grid */}
      {financeLoading && displayAccounts.length === 0 && !creatingWalletName ? (
        <div className="py-12 flex justify-center">
          <ProgressLoading message="Loading wallet balances..." theme="teal" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayAccounts.map((acc) => {
            const Icon = getWalletIcon(acc.type);
            const gradient = getWalletGradient(acc.type);
            const budgetUsage =
              acc.budgetLimit && acc.budgetLimit > 0
                ? Math.min((acc.monthlyExpense / acc.budgetLimit) * 100, 100)
                : null;

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Colored Header Strip */}
                <div className={`bg-gradient-to-r ${gradient} px-6 py-4 flex items-center justify-between`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white">{acc.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white uppercase tracking-wider">
                          {getRoleLabel(acc.role)}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                        {acc.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(acc)}
                      title={`Edit ${acc.name}`}
                      className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {displayAccounts.length > 1 && (
                      <button
                        onClick={() => handleDeleteClick(acc.id, acc.name)}
                        title={`Delete ${acc.name}`}
                        className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Current Balance & Last Month Carryover */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                        Current Balance
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {acc.isCarriedOver && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[10px] font-semibold">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>From Last Month</span>
                          </span>
                        )}
                        {acc.startingBalance !== undefined && (
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            Start: {formatMMK(acc.startingBalance)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatMMK(acc.balance)}
                    </div>
                    {acc.earmarkedSavings > 0 && (
                      <div className="mt-1.5 flex items-center justify-between text-[11px] bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-lg px-2.5 py-1">
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                          In Savings Goals: {formatMMK(acc.earmarkedSavings)}
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 font-bold">
                          Available: {formatMMK(acc.availableBalance)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Monthly Activity */}
                  <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <ArrowUpDown className="w-3 h-3" />
                      <span>
                        {monthLabel} {year} Activity
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Income</div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMMK(acc.monthlyIncome)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Expense</div>
                        <div className="text-sm font-bold text-rose-500 dark:text-rose-400">
                          {formatMMK(acc.monthlyExpense)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Leftover</div>
                        <div
                          className={`text-sm font-bold ${
                            acc.monthlyNet >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-500 dark:text-rose-400'
                          }`}
                        >
                          {acc.monthlyNet >= 0 ? '+' : ''}
                          {formatMMK(acc.monthlyNet)}
                        </div>
                      </div>
                    </div>
                    {(acc.monthlyTransfersIn > 0 || acc.monthlyTransfersOut > 0) && (
                      <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-sky-600 dark:text-sky-400">
                          Moved In: +{formatMMK(acc.monthlyTransfersIn)}
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                          Moved Out: -{formatMMK(acc.monthlyTransfersOut)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Spending Limit Usage Bar */}
                  {acc.budgetLimit != null && acc.budgetLimit > 0 && budgetUsage !== null && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Monthly Spending Limit</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatMMK(acc.monthlyExpense)} / {formatMMK(acc.budgetLimit)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            budgetUsage > 90 ? 'bg-rose-500' : budgetUsage > 70 ? 'bg-amber-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${budgetUsage}%` }}
                        />
                      </div>
                      <div className="text-right text-[10px] font-semibold text-slate-400">
                        {budgetUsage.toFixed(0)}% used
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Skeleton Card Placeholder while creating a new wallet */}
          {creatingWalletName && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-teal-400/70 dark:border-teal-600/60 shadow-sm overflow-hidden animate-pulse">
              <div className="bg-gradient-to-r from-teal-500/80 to-emerald-600/80 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white/25 flex items-center justify-center">
                    <RotateCw className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{creatingWalletName}</h3>
                    <span className="text-xs font-medium text-white/80">Creating wallet...</span>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-7 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-3 space-y-2">
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!financeLoading && displayAccounts.length === 0 && !creatingWalletName && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No wallets yet. Add your first wallet to get started.</p>
        </div>
      )}

      {/* Transfers & Cash Swaps Box (with dedicated loading animation) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {monthLabel} {year} Transfers &amp; Cash Swaps
            </h2>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Not counted as Expenses or Budgets
          </span>
        </div>

        {transfersLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between animate-pulse py-1">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-2.5 w-32 bg-slate-100 dark:bg-slate-800/80 rounded" />
                  </div>
                </div>
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : recentTransfers.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransfers.map((tr) => (
              <div
                key={tr.id}
                className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                      <span>
                        {tr.account?.name} → {tr.toAccount?.name || 'Wallet'}
                      </span>
                      {tr.transferTag && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tr.transferTag === 'RESERVE_DRAW'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                          }`}
                        >
                          {formatTransferTagLabel(tr.transferTag)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {tr.description || 'Wallet Transfer'} • {new Date(tr.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{formatMMK(tr.amount)}</span>
                  <button
                    onClick={() => handleDeleteTransfer(tr)}
                    title="Delete transfer"
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No wallet transfers recorded in {monthLabel} {year} yet. Use <strong>Move Money</strong> when withdrawing cash, swapping with family, or topping up KPay.
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {isAddModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsAddModalOpen(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-teal-50/50 dark:bg-teal-950/30">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Add New Wallet</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateWallet} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Wallet Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AYA Bank, KPay, Wardrobe Cash"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    required
                    className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Account Type
                  </label>
                  <select
                    value={walletType}
                    onChange={(e) => {
                      const nextType = e.target.value as any;
                      setWalletType(nextType);
                      setWalletRole(
                        nextType === 'BANK'
                          ? 'RESERVE'
                          : nextType === 'SAVINGS'
                          ? 'SAVINGS_HOLDING'
                          : 'DAILY_SPENDING'
                      );
                    }}
                    className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="CASH" className="dark:bg-slate-900">Cash in Hand</option>
                    <option value="MOBILE_WALLET" className="dark:bg-slate-900">Mobile Wallet (KPay, Wave)</option>
                    <option value="BANK" className="dark:bg-slate-900">Bank Account</option>
                    <option value="SAVINGS" className="dark:bg-slate-900">Savings Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Wallet Purpose
                  </label>
                  <select
                    value={walletRole}
                    onChange={(e) => setWalletRole(e.target.value as any)}
                    className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="DAILY_SPENDING" className="dark:bg-slate-900">Daily Use (KPay, Everyday Cash)</option>
                    <option value="RESERVE" className="dark:bg-slate-900">Main Bank / Backup (KBZ Bank)</option>
                    <option value="SAVINGS_HOLDING" className="dark:bg-slate-900">Savings Storage (AYA Bank, Wardrobe Cash)</option>
                  </select>
                </div>

                {/* Starting Balance with live comma preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Starting Balance (MMK)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      className="w-full text-xl font-black text-slate-900 dark:text-slate-100 px-3.5 py-2.5 pr-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                      Kyat
                    </span>
                  </div>
                  {parsedInitialBalance > 0 && (
                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-1 pl-1">
                      {formatMMK(parsedInitialBalance)}
                    </p>
                  )}
                </div>

                {/* Optional Monthly Limit with live comma preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Monthly Spending Limit (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="e.g. 350000"
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(e.target.value)}
                      className="w-full text-sm font-semibold px-3 py-2.5 pr-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                      Kyat
                    </span>
                  </div>
                  {parsedBudgetLimit > 0 && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 pl-1">
                      Limit: {formatMMK(parsedBudgetLimit)}
                    </p>
                  )}
                </div>

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
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/20 transition-all"
                  >
                    Save Wallet
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Account Modal */}
      {editingAccount &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingAccount(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-teal-50/50 dark:bg-teal-950/30">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Edit Wallet</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Update name, purpose, or balance for <span className="font-semibold text-teal-600 dark:text-teal-400">{monthLabel} {year}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingAccount(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Wallet Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Account Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="CASH" className="dark:bg-slate-900">Cash in Hand</option>
                    <option value="MOBILE_WALLET" className="dark:bg-slate-900">Mobile Wallet (KPay, Wave)</option>
                    <option value="BANK" className="dark:bg-slate-900">Bank Account</option>
                    <option value="SAVINGS" className="dark:bg-slate-900">Savings Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Wallet Purpose
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="DAILY_SPENDING" className="dark:bg-slate-900">Daily Use (KPay, Everyday Cash)</option>
                    <option value="RESERVE" className="dark:bg-slate-900">Main Bank / Backup (KBZ Bank)</option>
                    <option value="SAVINGS_HOLDING" className="dark:bg-slate-900">Savings Storage (AYA Bank, Wardrobe Cash)</option>
                  </select>
                </div>

                {/* Starting Balance with Quick Reset and live comma preview */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {monthLabel} {year} Starting Balance (MMK)
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditBalance('0')}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-2 py-0.5 rounded-md transition-colors"
                    >
                      Set to 0
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={editBalance}
                      onChange={(e) => setEditBalance(e.target.value)}
                      required
                      className="w-full text-2xl font-black text-slate-900 dark:text-slate-100 px-3.5 py-2.5 pr-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                      Kyat
                    </span>
                  </div>
                  {editBalance !== '' && !isNaN(Number(editBalance)) && (
                    <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-1 pl-0.5">
                      {formatMMK(Number(editBalance))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Monthly Spending Limit (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="e.g. 350000"
                      value={editBudgetLimit}
                      onChange={(e) => setEditBudgetLimit(e.target.value)}
                      className="w-full text-sm font-semibold px-3 py-2.5 pr-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                      Kyat
                    </span>
                  </div>
                  {editBudgetLimit !== '' && Number(editBudgetLimit) > 0 && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 pl-0.5">
                      Limit: {formatMMK(Number(editBudgetLimit))}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {editLoading ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {deletingAccount &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) setDeletingAccount(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-500 dark:text-rose-400 mb-4 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Delete Wallet</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-100">"{deletingAccount.name}"</span>?
                  </p>
                  <div className="mt-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl p-3 text-left space-y-1">
                    <div className="font-bold flex items-center space-x-1.5 text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Cannot Be Undone</span>
                    </div>
                    <p className="text-rose-600 dark:text-rose-400 leading-relaxed pl-5">
                      All transactions and monthly records in this wallet will be removed.
                    </p>
                  </div>
                  {deleteError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-2.5 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg">
                      {deleteError}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeletingAccount(null)}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isDeleting ? (
                      <span>Deleting...</span>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Wallet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Reset Balances Confirmation Modal */}
      {isResetModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isResettingAll) setIsResetModalOpen(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-4 mx-auto">
                  <RotateCcw className="w-6 h-6" />
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Reset Monthly Starting Balances</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Set all starting wallet balances to <span className="font-semibold text-slate-900 dark:text-slate-100">0 MMK</span> for <span className="font-bold text-teal-600 dark:text-teal-400">{monthLabel} {year}</span>?
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 text-left">
                    This only changes {monthLabel} {year}. Your earlier months remain untouched.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={isResettingAll}
                    onClick={() => setIsResetModalOpen(false)}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isResettingAll}
                    onClick={handleConfirmResetAll}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isResettingAll ? (
                      <span>Resetting...</span>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset to 0</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          loadTransfers();
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingTransfer}
        title="Delete Transfer"
        description={
          deletingTransfer
            ? `Delete transfer ${deletingTransfer.account?.name || ''} → ${deletingTransfer.toAccount?.name || 'Wallet'} (${formatMMK(deletingTransfer.amount)})?`
            : 'Delete this transfer?'
        }
        warningTitle="Wallet Balances Revert"
        warningText="Both wallets will return to their balances before this transfer."
        confirmLabel="Delete Transfer"
        isDeleting={isDeletingTransfer}
        error={deleteTransferError}
        onClose={() => {
          if (!isDeletingTransfer) setDeletingTransfer(null);
        }}
        onConfirm={handleConfirmDeleteTransfer}
      />
    </div>
  );
}
