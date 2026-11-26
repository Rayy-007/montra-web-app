'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  PiggyBank,
  Plus,
  Laptop,
  ShieldCheck,
  Sparkles,
  Wallet,
  ArrowRight,
  Trash2,
  Edit2,
  X,
  Check,
  RotateCw,
  MinusCircle,
  PlusCircle,
  Landmark,
  Banknote,
  Smartphone,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { useToast } from '../../context/ToastContext';
import { formatMMK, MONTHS, formatDateTime, toLocalDateTimeInput } from '../../lib/utils';
import { ProgressLoading } from '../../components/ProgressLoading';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import api from '../../lib/api';

const GOAL_ICONS = [
  { id: 'Laptop', label: 'Laptop / Tech', icon: Laptop },
  { id: 'PiggyBank', label: 'General Savings', icon: PiggyBank },
  { id: 'ShieldCheck', label: 'Emergency Fund', icon: ShieldCheck },
  { id: 'Sparkles', label: 'Life Goal', icon: Sparkles },
];

const GOAL_COLORS = [
  '#10B981', // Emerald
  '#0EA5E9', // Sky
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Violet
];

export default function SavingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { accounts, month, year, refreshData } = useFinance();

  const [savingsData, setSavingsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create / Edit Goal Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalIcon, setGoalIcon] = useState('PiggyBank');
  const [goalColor, setGoalColor] = useState('#10B981');
  const [savingGoal, setSavingGoal] = useState(false);

  // Allocate / Save Money Modal
  const [allocModalGoal, setAllocModalGoal] = useState<any | null>(null);
  const [allocDirection, setAllocDirection] = useState<'ADD' | 'WITHDRAW'>('ADD');
  const [allocMode, setAllocMode] = useState<'TRANSFER_AND_SAVE' | 'EARMARK'>('TRANSFER_AND_SAVE');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocNote, setAllocNote] = useState('');
  const [allocDate, setAllocDate] = useState(() => toLocalDateTimeInput());
  const [allocSubmitting, setAllocSubmitting] = useState(false);
  const [allocError, setAllocError] = useState('');

  // Custom Delete Modals
  const [deletingGoal, setDeletingGoal] = useState<any | null>(null);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [deleteGoalError, setDeleteGoalError] = useState<string | null>(null);
  const [deletingAllocation, setDeletingAllocation] = useState<any | null>(null);
  const [isDeletingAllocation, setIsDeletingAllocation] = useState(false);
  const [deleteAllocationError, setDeleteAllocationError] = useState<string | null>(null);
  const [smashingGoalId, setSmashingGoalId] = useState<string | null>(null);
  const [smashingAllocId, setSmashingAllocId] = useState<string | null>(null);
  const [hiddenGoalIds, setHiddenGoalIds] = useState<string[]>([]);
  const [hiddenAllocIds, setHiddenAllocIds] = useState<string[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadSavings = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get(`/savings?month=${month}&year=${year}`);
      setSavingsData(res.data);
    } catch (err) {
      console.error('Failed to load savings goals:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, month, year]);

  useEffect(() => {
    if (user) loadSavings(false);
  }, [user, month, year, loadSavings]);

  const openCreateGoal = () => {
    setEditingGoal(null);
    setGoalName('');
    setGoalTarget('');
    setGoalIcon('Laptop');
    setGoalColor('#10B981');
    setIsGoalModalOpen(true);
  };

  const openEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalTarget(goal.targetAmount ? String(goal.targetAmount) : '');
    setGoalIcon(goal.icon || 'PiggyBank');
    setGoalColor(goal.color || '#10B981');
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) return;

    setSavingGoal(true);
    try {
      const parsedTarget = goalTarget.trim() ? parseFloat(goalTarget.replace(/,/g, '')) : null;
      const payload = {
        name: goalName.trim(),
        targetAmount: parsedTarget && parsedTarget > 0 ? parsedTarget : null,
        icon: goalIcon,
        color: goalColor,
      };

      if (editingGoal) {
        await api.put(`/savings/goals/${editingGoal.id}`, payload);
      } else {
        await api.post('/savings/goals', payload);
      }

      setIsGoalModalOpen(false);
      showToast(editingGoal ? 'Savings goal updated' : 'Savings goal created', 'success');
      await loadSavings(true);
      await refreshData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save goal.');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDeleteGoal = (goal: any) => {
    setDeleteGoalError(null);
    setDeletingGoal(goal);
  };

  const handleConfirmDeleteGoal = async () => {
    if (!deletingGoal) return;
    const { id, name } = deletingGoal;
    setIsDeletingGoal(true);
    setDeleteGoalError(null);
    try {
      await api.delete(`/savings/goals/${id}`);
      setDeletingGoal(null);
      setIsDeletingGoal(false);
      setSmashingGoalId(id);
      showToast(`Deleted "${name}" savings goal`, 'delete');
      setTimeout(() => {
        setHiddenGoalIds((prev) => [...prev, id]);
        setSmashingGoalId(null);
        loadSavings(true);
        refreshData();
      }, 380);
    } catch (err: any) {
      setDeleteGoalError(err.response?.data?.message || 'Failed to delete goal.');
      setIsDeletingGoal(false);
    }
  };

  const openAllocateModal = (goal: any, direction: 'ADD' | 'WITHDRAW' = 'ADD') => {
    setAllocModalGoal(goal);
    setAllocDirection(direction);
    setAllocError('');
    setAllocAmount('');
    setAllocNote('');
    setAllocDate(toLocalDateTimeInput());

    const savingsWallet =
      accounts.find((a) => a.role === 'SAVINGS_HOLDING' || a.type === 'SAVINGS') ||
      accounts.find((a) => a.name.toLowerCase().includes('aya')) ||
      accounts[0];
    const sourceWallet =
      accounts.find((a) => a.id !== savingsWallet?.id && a.role === 'DAILY_SPENDING') ||
      accounts.find((a) => a.id !== savingsWallet?.id) ||
      accounts[0];

    if (direction === 'WITHDRAW') {
      setAllocMode('EARMARK');
      const existingHolder = goal.walletBreakdown?.[0]?.accountId || savingsWallet?.id || '';
      setToAccountId(existingHolder);
    } else {
      setAllocMode(accounts.length >= 2 ? 'TRANSFER_AND_SAVE' : 'EARMARK');
      setFromAccountId(sourceWallet?.id || '');
      setToAccountId(savingsWallet?.id || '');
    }
  };

  const handleSubmitAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocModalGoal) return;
    setAllocError('');

    const rawAmount = parseFloat(allocAmount.replace(/,/g, '')) || 0;
    if (rawAmount <= 0) {
      setAllocError('Please enter an amount greater than 0.');
      return;
    }

    const signedAmount = allocDirection === 'WITHDRAW' ? -rawAmount : rawAmount;
    const effectiveMode = allocDirection === 'WITHDRAW' ? 'EARMARK' : allocMode;

    if (effectiveMode === 'TRANSFER_AND_SAVE' && (!fromAccountId || fromAccountId === toAccountId)) {
      setAllocError('Please choose two different wallets (From Wallet → Save In Wallet).');
      return;
    }

    setAllocSubmitting(true);
    try {
      await api.post('/savings/allocate', {
        goalId: allocModalGoal.id,
        mode: effectiveMode,
        fromAccountId: effectiveMode === 'TRANSFER_AND_SAVE' ? fromAccountId : null,
        toAccountId,
        amount: signedAmount,
        note: allocNote.trim() || null,
        date: new Date(allocDate).toISOString(),
      });

      setAllocModalGoal(null);
      showToast(
        allocDirection === 'ADD' ? 'Savings added successfully' : 'Savings updated',
        'success'
      );
      await Promise.all([loadSavings(true), refreshData()]);
    } catch (err: any) {
      setAllocError(err.response?.data?.message || 'Failed to save contribution.');
    } finally {
      setAllocSubmitting(false);
    }
  };

  const handleDeleteAllocation = (item: any) => {
    setDeleteAllocationError(null);
    setDeletingAllocation(item);
  };

  const handleConfirmDeleteAllocation = async () => {
    if (!deletingAllocation) return;
    const id = deletingAllocation.id;
    setIsDeletingAllocation(true);
    setDeleteAllocationError(null);
    try {
      await api.delete(`/savings/allocations/${id}`);
      setDeletingAllocation(null);
      setIsDeletingAllocation(false);
      setSmashingAllocId(id);
      showToast('Savings entry removed', 'delete');
      setTimeout(() => {
        setHiddenAllocIds((prev) => [...prev, id]);
        setSmashingAllocId(null);
        loadSavings(true);
        refreshData();
      }, 380);
    } catch (err: any) {
      setDeleteAllocationError(err.response?.data?.message || 'Failed to delete entry.');
      setIsDeletingAllocation(false);
    }
  };

  const getGoalIconComponent = (iconId: string) => {
    return GOAL_ICONS.find((i) => i.id === iconId)?.icon || PiggyBank;
  };

  const getAccountTypeIcon = (type: string) => {
    if (type === 'BANK' || type === 'SAVINGS') return Landmark;
    if (type === 'MOBILE_WALLET') return Smartphone;
    return Banknote;
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Loading your account..." theme="emerald" />
      </div>
    );
  }

  const monthLabel = MONTHS.find((m) => m.value === month)?.label || 'Month';
  const goals: any[] = (savingsData?.goals || []).filter((g: any) => !hiddenGoalIds.includes(g.id));
  const walletHoldings: any[] = savingsData?.walletHoldings || [];
  const recentAllocations: any[] = (savingsData?.recentAllocations || []).filter(
    (a: any) => !hiddenAllocIds.includes(a.id)
  );
  const summary = savingsData?.summary || {
    totalSavedAllGoals: 0,
    totalTargetAllGoals: 0,
    savedSelectedMonth: 0,
    goalCount: 0,
  };

  const parsedTargetNumber = parseFloat(goalTarget.replace(/,/g, '')) || 0;
  const parsedAllocNumber = parseFloat(allocAmount.replace(/,/g, '')) || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <PiggyBank className="w-4 h-4" />
            <span>Personal Savings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Savings Goals
          </h1>
          <div className="flex items-center space-x-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {monthLabel} {year}
            </span>
            <InfoTooltip content="Save money for goals like Laptop or General Savings inside AYA Bank or Cash—never counted as Expenses." />
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => loadSavings(true)}
            disabled={isRefreshing || loading}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline text-xs font-semibold">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>
          <button
            onClick={openCreateGoal}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Savings Goal</span>
          </button>
        </div>
      </div>

      {/* Simple Callout */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 flex items-start space-x-3 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
        <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Not Counted as Expense:</span> Money you save for your{' '}
          <strong>Laptop</strong> or <strong>General Savings</strong> in <strong>AYA Bank</strong> or{' '}
          <strong>Cash</strong> will never increase your monthly Expenses or Budgets.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Saved
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatMMK(summary.totalSavedAllGoals)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Added in {monthLabel} {year}
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            +{formatMMK(summary.savedSelectedMonth)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Stored In Wallets
          </div>
          {walletHoldings.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {walletHoldings.map((wh) => (
                <span
                  key={wh.accountId}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <span>{wh.accountName}:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {formatMMK(wh.totalEarmarked)}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm font-medium text-slate-400 mt-1.5">
              No wallet money saved yet
            </div>
          )}
        </div>
      </div>

      {/* Savings Goals Cards */}
      {loading && !savingsData ? (
        <div className="py-12 flex justify-center">
          <ProgressLoading message="Loading your savings goals..." theme="emerald" />
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
            <Laptop className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Create your first Savings Goal
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Start a <strong>Laptop Fund</strong> or <strong>General Savings</strong> goal and track how much sits in AYA Bank and Cash.
            </p>
          </div>
          <button
            onClick={openCreateGoal}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Goal (e.g. Laptop)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const GoalIcon = getGoalIconComponent(goal.icon);
            const remaining =
              goal.targetAmount && goal.targetAmount > 0
                ? Math.max(0, goal.targetAmount - goal.totalSaved)
                : null;

            return (
              <div
                key={goal.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                  smashingGoalId === goal.id ? 'animate-item-smash' : ''
                }`}
              >
                <div>
                  <div className="h-2 w-full" style={{ backgroundColor: goal.color || '#10B981' }} />

                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: goal.color || '#10B981' }}
                        >
                          <GoalIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {goal.name}
                          </h3>
                          {goal.targetAmount ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Goal: {formatMMK(goal.targetAmount)}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              No fixed target
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditGoal(goal)}
                          title="Edit goal"
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal)}
                          title="Delete goal"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                          {formatMMK(goal.totalSaved)}
                        </span>
                        {goal.progressPercent !== null && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {goal.progressPercent}%
                          </span>
                        )}
                      </div>

                      {goal.targetAmount && goal.progressPercent !== null && (
                        <div className="mt-2 space-y-1">
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${goal.progressPercent}%`,
                                backgroundColor: goal.color || '#10B981',
                              }}
                            />
                          </div>
                          {remaining !== null && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                              {remaining === 0 ? 'Goal reached!' : `${formatMMK(remaining)} left`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Saved Inside</span>
                      </div>
                      {goal.walletBreakdown && goal.walletBreakdown.length > 0 ? (
                        <div className="space-y-1.5">
                          {goal.walletBreakdown.map((wb: any) => {
                            const WIcon = getAccountTypeIcon(wb.accountType);
                            return (
                              <div
                                key={wb.accountId}
                                className="flex items-center justify-between text-xs font-semibold"
                              >
                                <span className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                                  <WIcon className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{wb.accountName}</span>
                                </span>
                                <span className="text-slate-900 dark:text-slate-100 font-bold">
                                  {formatMMK(wb.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No money added yet</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-5 flex items-center space-x-2">
                  <button
                    onClick={() => openAllocateModal(goal, 'ADD')}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Savings</span>
                  </button>
                  {goal.totalSaved > 0 && (
                    <button
                      onClick={() => openAllocateModal(goal, 'WITHDRAW')}
                      className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1"
                      title="Take out or use saved money"
                    >
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span>Take Out</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Savings Log */}
      {recentAllocations.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Savings History
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentAllocations.map((item) => {
              const isPositive = item.amount > 0;
              return (
                <div
                  key={item.id}
                  className={`px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                    smashingAllocId === item.id ? 'animate-item-smash bg-rose-50/70 dark:bg-rose-950/30' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.goalColor }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.goalName}{' '}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          • In {item.accountName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {item.note || (isPositive ? 'Saved' : 'Taken out')} •{' '}
                        {formatDateTime(item.date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-sm font-bold ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {formatMMK(item.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteAllocation(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      {isGoalModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !savingGoal) setIsGoalModalOpen(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/30">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
                </h3>
                <button
                  onClick={() => setIsGoalModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Laptop, General Savings"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    required
                    className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Goal Amount in MMK (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      className="w-full text-xl font-black px-3.5 py-2.5 pr-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                      Kyat
                    </span>
                  </div>
                  {parsedTargetNumber > 0 ? (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 pl-1">
                      {formatMMK(parsedTargetNumber)}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 pl-1">
                      Leave empty for General Savings with no fixed target.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Icon &amp; Color
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {GOAL_ICONS.map((gi) => {
                      const GIcon = gi.icon;
                      return (
                        <button
                          key={gi.id}
                          type="button"
                          onClick={() => setGoalIcon(gi.id)}
                          className={`p-2 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-colors ${
                            goalIcon === gi.id
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <GIcon className="w-4 h-4" />
                          <span>{gi.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center space-x-2">
                    {GOAL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setGoalColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          goalColor === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGoalModalOpen(false)}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingGoal}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {savingGoal ? 'Saving...' : editingGoal ? 'Save Changes' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Save / Take Out Money Modal */}
      {allocModalGoal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !allocSubmitting) setAllocModalGoal(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto animate-modal-slide">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/30">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {allocDirection === 'ADD'
                      ? `Add Savings to "${allocModalGoal.name}"`
                      : `Take Out from "${allocModalGoal.name}"`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Saved so far: {formatMMK(allocModalGoal.totalSaved)}
                  </p>
                </div>
                <button
                  onClick={() => setAllocModalGoal(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAllocation} className="p-6 space-y-4">
                {allocError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {allocError}
                  </div>
                )}

                {allocDirection === 'ADD' && (
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAllocMode('TRANSFER_AND_SAVE')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        allocMode === 'TRANSFER_AND_SAVE'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Move &amp; Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllocMode('EARMARK')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        allocMode === 'EARMARK'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Already in Wallet
                    </button>
                  </div>
                )}

                {allocDirection === 'ADD' && allocMode === 'TRANSFER_AND_SAVE' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2.5 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        From Wallet
                      </label>
                      <select
                        value={fromAccountId}
                        onChange={(e) => setFromAccountId(e.target.value)}
                        className="w-full text-sm font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id} className="dark:bg-slate-900">
                            {acc.name} ({formatMMK(acc.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="hidden sm:flex items-center justify-center h-10 text-slate-400">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Save Into Wallet
                      </label>
                      <select
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        className="w-full text-sm font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id} className="dark:bg-slate-900">
                            {acc.name} ({formatMMK(acc.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      {allocDirection === 'ADD'
                        ? 'Which Wallet Has This Money?'
                        : 'Take Out From Which Wallet?'}
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="w-full text-sm font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id} className="dark:bg-slate-900">
                          {acc.name} ({formatMMK(acc.balance)})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Uses money already sitting inside this wallet without moving it between wallets.
                    </p>
                  </div>
                )}

                {/* Amount with live comma preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Amount (MMK)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={allocAmount}
                      onChange={(e) => setAllocAmount(e.target.value)}
                      required
                      min="1"
                      className="w-full text-2xl font-black px-3.5 py-2.5 pr-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                      Kyat
                    </span>
                  </div>
                  {parsedAllocNumber > 0 && (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 pl-1">
                      {formatMMK(parsedAllocNumber)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={allocDate}
                      onChange={(e) => setAllocDate(e.target.value)}
                      required
                      className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kept cash in wardrobe"
                      value={allocNote}
                      onChange={(e) => setAllocNote(e.target.value)}
                      className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAllocModalGoal(null)}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={allocSubmitting}
                    className={`flex-1 py-2.5 px-4 text-sm font-semibold text-white rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-2 ${
                      allocDirection === 'ADD'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {allocSubmitting
                        ? 'Saving...'
                        : allocDirection === 'ADD'
                        ? 'Save Money'
                        : 'Take Out'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDeleteModal
        isOpen={!!deletingGoal}
        title="Delete Savings Goal"
        description={
          deletingGoal
            ? `Are you sure you want to delete "${deletingGoal.name}"?`
            : 'Delete this savings goal?'
        }
        warningTitle="Wallet Money Stays Safe"
        warningText="Only the goal label will be removed. Your money in AYA Bank, Cash, or other wallets will NOT be deleted."
        confirmLabel="Delete Goal"
        isDeleting={isDeletingGoal}
        error={deleteGoalError}
        onClose={() => {
          if (!isDeletingGoal) setDeletingGoal(null);
        }}
        onConfirm={handleConfirmDeleteGoal}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingAllocation}
        title="Delete Savings Entry"
        description={
          deletingAllocation
            ? `Remove this ${formatMMK(Math.abs(deletingAllocation.amount))} entry from "${deletingAllocation.goalName}"?`
            : 'Remove this savings record?'
        }
        warningTitle="Goal Progress Update"
        warningText="Removing this entry updates the saved total on your goal without changing your wallet balance."
        confirmLabel="Remove Entry"
        isDeleting={isDeletingAllocation}
        error={deleteAllocationError}
        onClose={() => {
          if (!isDeletingAllocation) setDeletingAllocation(null);
        }}
        onConfirm={handleConfirmDeleteAllocation}
      />
    </div>
  );
}
