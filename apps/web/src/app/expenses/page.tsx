'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  ArrowDownRight, 
  Wallet, 
  RotateCw 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { formatMMK, MONTHS } from '../../lib/utils';
import { AddExpenseModal } from '../../components/AddExpenseModal';
import { ProgressLoading } from '../../components/ProgressLoading';
import api from '../../lib/api';

export default function ExpensesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { 
    month, 
    year, 
    accounts, 
    categories, 
    refreshData, 
    getCachedExpenses, 
    setCachedExpenses 
  } = useFinance();

  const [transactions, setTransactions] = useState<any[]>(() => {
    return getCachedExpenses(month, year) || [];
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadTransactions = async (forceRefresh = false) => {
    if (!user) return;

    // Check cache first for instant display
    const cached = getCachedExpenses(month, year);
    if (cached && !forceRefresh) {
      setTransactions(cached);
      return;
    }

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get(`/transactions?month=${month}&year=${year}&type=EXPENSE`);
      setTransactions(res.data);
      setCachedExpenses(res.data, month, year);
    } catch (err) {
      console.error('Failed to load expense transactions:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // When month or year changes, check cache or fetch
    const cached = getCachedExpenses(month, year);
    if (cached) {
      setTransactions(cached);
    } else {
      loadTransactions(false);
    }
  }, [user, month, year]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense? This will refund the wallet balance.')) return;
    
    // Optimistic UI update
    const previous = [...transactions];
    const updated = transactions.filter(tx => tx.id !== id);
    setTransactions(updated);
    setCachedExpenses(updated, month, year);

    try {
      await api.delete(`/transactions/${id}`);
      refreshData();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setTransactions(previous);
      setCachedExpenses(previous, month, year);
      alert('Failed to delete transaction. Restored.');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.account?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWallet = selectedWallet === 'ALL' || tx.accountId === selectedWallet;
    const matchesCategory = selectedCategory === 'ALL' || tx.categoryId === selectedCategory;
    return matchesSearch && matchesWallet && matchesCategory;
  });

  const totalFilteredExpense = filteredTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <ProgressLoading message="Authenticating session..." theme="rose" />
      </div>
    );
  }

  const currentMonthName = MONTHS.find((m) => m.value === month)?.label || 'Month';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 text-xs font-semibold uppercase tracking-wider">
            <Receipt className="w-4 h-4" />
            <span>Expense Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {currentMonthName} {year} Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Total Logged Spending: <span className="text-rose-600 font-bold ml-1">{formatMMK(totalFilteredExpense)}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Refresh Button */}
          <button
            onClick={() => {
              loadTransactions(true);
              refreshData();
            }}
            disabled={isRefreshing || loading}
            title="Refresh expenses data"
            className="p-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-600' : ''}`} />
            <span className="hidden sm:inline text-xs font-semibold">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>

          {/* Add Expense Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search description, category, or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* Filter by Wallet */}
        <div className="w-full md:w-auto flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">Wallet:</label>
          <select
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
            className="text-xs sm:text-sm font-medium py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
          >
            <option value="ALL">All Wallets</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Category */}
        <div className="w-full md:w-auto flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs sm:text-sm font-medium py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.filter(c => c.type === 'EXPENSE').map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expense Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Recorded Transactions</h2>
          <span className="text-xs text-slate-400">{filteredTransactions.length} expenses found</span>
        </div>

        {loading && transactions.length === 0 ? (
          <ProgressLoading message="Fetching expense transactions..." theme="rose" />
        ) : filteredTransactions.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Account / Wallet</th>
                    <th className="px-6 py-3.5">Description</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                          {tx.category?.name || 'General Expense'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                          <Wallet className="w-3.5 h-3.5 text-slate-400" />
                          <span>{tx.account?.name}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {tx.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600">
                        -{formatMMK(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          title="Delete expense"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                        {tx.category?.name || 'General Expense'}
                      </span>
                      <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500">
                        <Wallet className="w-3 h-3 text-slate-400" />
                        <span>{tx.account?.name}</span>
                      </span>
                    </div>
                    {tx.description && (
                      <p className="text-xs text-slate-600 truncate">{tx.description}</p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-sm font-bold text-rose-600">
                      -{formatMMK(tx.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      title="Delete expense"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No expenses found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't logged any expenses matching this criteria for {currentMonthName}.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-all inline-flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log First Expense</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadTransactions(true);
        }}
      />
    </div>
  );
}
