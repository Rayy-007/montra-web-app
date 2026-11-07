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
  RotateCw,
  Edit2,
  Tag,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinancialContext';
import { formatMMK, MONTHS } from '../../lib/utils';
import { AddExpenseModal } from '../../components/AddExpenseModal';
import { EditExpenseModal } from '../../components/EditExpenseModal';
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
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const handleToggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = !searchTerm.trim() ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.account?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWallet = selectedWallet === 'ALL' || tx.accountId === selectedWallet;
    const matchesCategory = selectedCategory === 'ALL' || tx.categoryId === selectedCategory;
    return matchesSearch && matchesWallet && matchesCategory;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    } else {
      const amountA = Number(a.amount);
      const amountB = Number(b.amount);
      return sortOrder === 'asc' ? amountA - amountB : amountB - amountA;
    }
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
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <Receipt className="w-4 h-4" />
            <span>Expense Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {currentMonthName} {year} Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Total Logged Spending: <span className="text-rose-600 dark:text-rose-400 font-bold ml-1">{formatMMK(totalFilteredExpense)}</span>
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
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-600 dark:text-rose-400' : ''}`} />
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

      {/* Filter, Search, and Sort Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input with perfectly centered icon & clear button */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search description, category, or wallet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Sorting Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-shrink-0">
            {/* Filter by Wallet */}
            <div className="relative">
              <Wallet className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all cursor-pointer shadow-sm appearance-none truncate"
              >
                <option value="ALL" className="dark:bg-slate-800">All Wallets</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="dark:bg-slate-800">
                    {acc.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter by Category */}
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all cursor-pointer shadow-sm appearance-none truncate"
              >
                <option value="ALL" className="dark:bg-slate-800">All Categories</option>
                {categories.filter((c) => c.type === 'EXPENSE').map((cat) => (
                  <option key={cat.id} value={cat.id} className="dark:bg-slate-800">
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Options */}
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-') as ['date' | 'amount', 'asc' | 'desc'];
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all cursor-pointer shadow-sm appearance-none truncate"
              >
                <option value="date-desc" className="dark:bg-slate-800">Date (Newest first)</option>
                <option value="date-asc" className="dark:bg-slate-800">Date (Oldest first)</option>
                <option value="amount-desc" className="dark:bg-slate-800">Amount (Highest first)</option>
                <option value="amount-asc" className="dark:bg-slate-800">Amount (Lowest first)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Active Filter Chips & Reset */}
        {(searchTerm || selectedWallet !== 'ALL' || selectedCategory !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 flex-wrap gap-1">
              <span>Active filters:</span>
              {searchTerm && (
                <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-medium px-2 py-0.5 rounded-md">
                  Search: "{searchTerm}"
                </span>
              )}
              {selectedWallet !== 'ALL' && (
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded-md">
                  Wallet: {accounts.find((a) => a.id === selectedWallet)?.name}
                </span>
              )}
              {selectedCategory !== 'ALL' && (
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded-md">
                  Category: {categories.find((c) => c.id === selectedCategory)?.name}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedWallet('ALL');
                setSelectedCategory('ALL');
              }}
              className="font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>

      {/* Expense Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recorded Transactions</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {sortedTransactions.length} of {transactions.length} expenses
          </span>
        </div>

        {loading && transactions.length === 0 ? (
          <ProgressLoading message="Fetching expense transactions..." theme="rose" />
        ) : sortedTransactions.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {/* Sortable Date Header */}
                    <th
                      onClick={() => handleToggleSort('date')}
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors select-none group"
                      title="Click to sort by Date"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className={sortBy === 'date' ? 'text-rose-600 dark:text-rose-400' : ''}>Date</span>
                        {sortBy === 'date' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Account / Wallet</th>
                    <th className="px-6 py-3.5">Description</th>
                    {/* Sortable Amount Header */}
                    <th
                      onClick={() => handleToggleSort('amount')}
                      className="px-6 py-3.5 text-right cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors select-none group"
                      title="Click to sort by Amount"
                    >
                      <div className="flex items-center justify-end space-x-1.5">
                        <span className={sortBy === 'amount' ? 'text-rose-600 dark:text-rose-400' : ''}>Amount</span>
                        {sortBy === 'amount' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {tx.category?.name || 'General Expense'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Wallet className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{tx.account?.name}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {tx.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        -{formatMMK(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => setEditingTx(tx)}
                            title="Edit expense details"
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(tx.id)}
                            title="Delete expense"
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {sortedTransactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {tx.category?.name || 'General Expense'}
                      </span>
                      <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <Wallet className="w-3 h-3 text-slate-400" />
                        <span>{tx.account?.name}</span>
                      </span>
                    </div>
                    {tx.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{tx.description}</p>
                    )}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      -{formatMMK(tx.amount)}
                    </span>
                    <button
                      onClick={() => setEditingTx(tx)}
                      title="Edit expense"
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      title="Delete expense"
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
            <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No expenses found</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
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

      {/* Edit Expense Modal */}
      <EditExpenseModal
        transaction={editingTx}
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        onSuccess={() => {
          loadTransactions(true);
        }}
      />
    </div>
  );
}
