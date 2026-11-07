'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  ArrowDownToLine,
  Save,
  RotateCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { formatMMK, MONTHS } from '../../lib/utils';
import { AddIncomeModal } from '../../components/AddIncomeModal';
import { ProgressLoading } from '../../components/ProgressLoading';
import api from '../../lib/api';

export default function IncomesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { 
    month, 
    year, 
    accounts, 
    refreshData, 
    getCachedIncomes, 
    setCachedIncomes 
  } = useFinance();

  const [incomesData, setIncomesData] = useState<any>(() => {
    return getCachedIncomes(month, year) || {
      summary: { totalExpected: 0, totalActual: 0, totalDiff: 0 },
      items: []
    };
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit income state
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [editSource, setEditSource] = useState('');
  const [editExpectedAmount, setEditExpectedAmount] = useState('');
  const [editExpectedDate, setEditExpectedDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Receive payout state
  const [receivingPlan, setReceivingPlan] = useState<any | null>(null);
  const [receiveAccountId, setReceiveAccountId] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receiveLoading, setReceiveLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const loadIncomes = async (forceRefresh = false) => {
    if (!user) return;

    const cached = getCachedIncomes(month, year);
    if (cached && !forceRefresh) {
      setIncomesData(cached);
      return;
    }

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get(`/incomes?month=${month}&year=${year}`);
      setIncomesData(res.data);
      setCachedIncomes(res.data, month, year);
    } catch (err) {
      console.error('Failed to load income streams:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const cached = getCachedIncomes(month, year);
    if (cached) {
      setIncomesData(cached);
    } else {
      loadIncomes(false);
    }
  }, [user, month, year]);

  useEffect(() => {
    if (accounts.length > 0 && !receiveAccountId) setReceiveAccountId(accounts[0].id);
  }, [accounts.length]);

  const handleOpenReceive = (plan: any) => {
    setReceivingPlan(plan);
    const remaining = Number(plan.expectedAmount) - Number(plan.actualAmount);
    setReceiveAmount(String(remaining > 0 ? remaining : plan.expectedAmount));
    setReceiveDate(new Date().toISOString().split('T')[0]);
  };

  const handleConfirmReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPlan || !receiveAccountId) return;
    setReceiveLoading(true);
    try {
      await api.post(`/incomes/${receivingPlan.id}/receive`, {
        accountId: receiveAccountId,
        actualAmount: parseFloat(receiveAmount.replace(/,/g, '')),
        actualDate: new Date(receiveDate).toISOString()
      });
      setReceivingPlan(null);
      await loadIncomes(true);
      refreshData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payout.');
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleOpenEdit = (plan: any) => {
    setEditingPlan(plan);
    setEditSource(plan.source);
    setEditExpectedAmount(String(plan.expectedAmount));
    setEditExpectedDate(plan.expectedDate ? plan.expectedDate.split('T')[0] : '');
    setEditDescription(plan.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setEditLoading(true);
    try {
      await api.put(`/incomes/${editingPlan.id}`, {
        source: editSource.trim(),
        expectedAmount: parseFloat(editExpectedAmount.replace(/,/g, '')),
        expectedDate: editExpectedDate ? new Date(editExpectedDate).toISOString() : null,
        month: editingPlan.month,
        year: editingPlan.year,
        description: editDescription.trim() || null,
      });
      setEditingPlan(null);
      await loadIncomes(true);
      refreshData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update income entry.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this income entry? This cannot be undone.')) return;
    try {
      await api.delete(`/incomes/${id}`);
      await loadIncomes(true);
      refreshData();
    } catch (err) {
      console.error('Failed to delete income:', err);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Authenticating session..." theme="emerald" />
      </div>
    );
  }

  const currentMonthName = MONTHS.find((m) => m.value === month)?.label || 'Month';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Income Planner — Expected vs. Actual</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {currentMonthName} {year} — Income
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track planned earnings against actual deposits. Click any row to edit.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadIncomes(true)}
            disabled={isRefreshing || loading}
            title="Refresh income streams"
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Income Stream</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Expected</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatMMK(incomesData.summary.totalExpected)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Received</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatMMK(incomesData.summary.totalActual)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Variance (Diff)</div>
          <div className={`text-2xl font-black ${incomesData.summary.totalDiff >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {formatMMK(incomesData.summary.totalDiff)}
          </div>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Income Streams</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">{incomesData.items.length} entries</span>
        </div>

        {loading && incomesData.items.length === 0 ? (
          <div className="py-12 flex justify-center">
            <ProgressLoading message="Fetching income streams..." theme="emerald" />
          </div>
        ) : incomesData.items.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5">Expected Date</th>
                    <th className="px-6 py-3.5">Expected</th>
                    <th className="px-6 py-3.5">Received</th>
                    <th className="px-6 py-3.5">Diff</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {incomesData.items.map((plan: any) => {
                    const isReceived = plan.status === 'RECEIVED';
                    const isPartial = plan.status === 'PARTIAL';
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{plan.source}</div>
                          {plan.description && (
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{plan.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {plan.expectedDate ? new Date(plan.expectedDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{formatMMK(plan.expectedAmount)}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{formatMMK(plan.actualAmount)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${plan.diff >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'}`}>
                            {plan.diff >= 0 ? '+' : ''}{formatMMK(plan.diff)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isReceived ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Received
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
                              <Clock className="w-3.5 h-3.5" />
                              Partial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEdit(plan)}
                              title="Edit this income entry"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            {/* Receive Payout */}
                            {!isReceived && (
                              <button
                                onClick={() => handleOpenReceive(plan)}
                                title="Record a received payout"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                Receive
                              </button>
                            )}
                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(plan.id)}
                              title="Delete income entry"
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
              {incomesData.items.map((plan: any) => {
                const isReceived = plan.status === 'RECEIVED';
                const isPartial = plan.status === 'PARTIAL';
                return (
                  <div key={plan.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{plan.source}</div>
                        {plan.description && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{plan.description}</div>
                        )}
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Date: {plan.expectedDate ? new Date(plan.expectedDate).toLocaleDateString() : '—'}
                        </div>
                      </div>
                      <div>
                        {isReceived ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Received
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl text-center">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Expected</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatMMK(plan.expectedAmount)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Received</div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatMMK(plan.actualAmount)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Diff</div>
                        <div className={`text-xs font-bold ${plan.diff >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          {plan.diff >= 0 ? '+' : ''}{formatMMK(plan.diff)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleOpenEdit(plan)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      {!isReceived && (
                        <button
                          onClick={() => handleOpenReceive(plan)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          Receive
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-16 space-y-3">
            <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No income streams for {currentMonthName}</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Add salary, freelance income, or any expected revenue to start tracking planned vs. actual receipts.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Income Stream
            </button>
          </div>
        )}
      </div>

      {/* Add Income Modal */}
      <AddIncomeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => loadIncomes(true)}
      />

      {/* Edit Income Modal */}
      {editingPlan && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingPlan(null); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-modal-slide">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Edit Income Entry</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update source, amount, or expected date</p>
                </div>
              </div>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Income Source</label>
                <input
                  type="text"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  required
                  placeholder="e.g. Monthly Salary, Freelance Project..."
                  className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Expected Amount (MMK)</label>
                <input
                  type="number"
                  value={editExpectedAmount}
                  onChange={(e) => setEditExpectedAmount(e.target.value)}
                  required min={1}
                  className="w-full text-xl font-bold px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Expected Date</label>
                <input
                  type="date"
                  value={editExpectedDate}
                  onChange={(e) => setEditExpectedDate(e.target.value)}
                  className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setEditingPlan(null)} className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Receive Payout Modal */}
      {receivingPlan && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setReceivingPlan(null); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-modal-slide">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <ArrowDownToLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Record Payout</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Deposit from "{receivingPlan.source}"</p>
                </div>
              </div>
              <button onClick={() => setReceivingPlan(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Deposit Into</label>
                <select
                  value={receiveAccountId}
                  onChange={(e) => setReceiveAccountId(e.target.value)}
                  className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="dark:bg-slate-800">{acc.name} ({formatMMK(acc.balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Amount Received (MMK)</label>
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  required min={1}
                  className="w-full text-2xl font-bold text-slate-900 dark:text-slate-100 px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                {receiveAmount && Number(receiveAmount) > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 pl-1">{formatMMK(Number(receiveAmount))}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Date Received</label>
                <input
                  type="date"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  className="w-full text-sm font-medium px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setReceivingPlan(null)} className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={receiveLoading} className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  <ArrowDownToLine className="w-4 h-4" />
                  {receiveLoading ? 'Recording...' : 'Confirm Deposit'}
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
