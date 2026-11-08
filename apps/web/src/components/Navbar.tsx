'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  PieChart,
  Wallet,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  Sun,
  Moon,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinancialContext';
import { useTheme } from '../context/ThemeContext';
import { MONTHS } from '../lib/utils';
import { Logo } from './Logo';
import { MonthlySummaryModal } from './MonthlySummaryModal';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { month, year, setMonth, setYear } = useFinance();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(year);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const realDate = new Date();
  const realCurrentMonth = realDate.getMonth() + 1;
  const realCurrentYear = realDate.getFullYear();

  // Keep pickerYear in sync with active year
  useEffect(() => {
    setPickerYear(year);
  }, [year]);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPickerOpen]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleSelectMonth = (selectedM: number) => {
    setMonth(selectedM);
    setYear(pickerYear);
    setIsPickerOpen(false);
  };

  const handleGoToCurrentMonth = () => {
    setMonth(realCurrentMonth);
    setYear(realCurrentYear);
    setPickerYear(realCurrentYear);
    setIsPickerOpen(false);
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Incomes', href: '/incomes', icon: TrendingUp },
    { label: 'Expenses', href: '/expenses', icon: Receipt },
    { label: 'Budgets', href: '/budgets', icon: PieChart },
    { label: 'Wallets', href: '/wallets', icon: Wallet },
  ];

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const currentMonthLabel = MONTHS.find((m) => m.value === month)?.label || 'Month';
  const yearOptions = Array.from({ length: 36 }, (_, i) => 2020 + i);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Logo size={34} withText textClassName="text-lg sm:text-xl" href="/dashboard" />

              {/* Desktop Navigation links */}
              <nav className="hidden md:flex items-center space-x-1 pl-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Controls: Month/Year selector, Theme Toggle & User Profile */}
            <div className="flex items-center space-x-1.5 sm:space-x-2.5">
              {/* Interactive Month & Year Navigator */}
              <div className="relative" ref={pickerRef}>
                <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm transition-all">
                  {/* Prev Month Chevron */}
                  <button
                    onClick={handlePrevMonth}
                    title="Previous Month"
                    className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Current Active Month Display & Trigger */}
                  <button
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                    title="Click to change active budgeting month & year"
                    className="flex items-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-800 dark:text-slate-200 font-bold"
                  >
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] sm:text-xs tracking-tight whitespace-nowrap">
                      <span className="inline sm:hidden">{currentMonthLabel.slice(0, 3)} '{String(year).slice(2)}</span>
                      <span className="hidden sm:inline">{currentMonthLabel} {year}</span>
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Next Month Chevron */}
                  <button
                    onClick={handleNextMonth}
                    title="Next Month"
                    className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Month & Year Picker Popover Dialog */}
                {isPickerOpen && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-4 z-50 animate-modal-slide">
                    {/* Popover Header: Year Stepper & Jump to Today */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setPickerYear(pickerYear - 1)}
                          title="Previous Year"
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Year Selector Dropdown for Long Term */}
                        <select
                          value={pickerYear}
                          onChange={(e) => setPickerYear(Number(e.target.value))}
                          className="font-black text-slate-900 dark:text-slate-100 text-sm bg-transparent cursor-pointer px-1 py-0.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none"
                        >
                          {yearOptions.map((y) => (
                            <option key={y} value={y} className="dark:bg-slate-900">{y}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => setPickerYear(pickerYear + 1)}
                          title="Next Year"
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Today / Current Month Button */}
                      <button
                        onClick={handleGoToCurrentMonth}
                        title="Jump to current real-time month"
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>This Month</span>
                      </button>
                    </div>

                    {/* 12 Months Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {MONTHS.map((m) => {
                        const isSelected = month === m.value && year === pickerYear;
                        const isRealCurrent = realCurrentMonth === m.value && realCurrentYear === pickerYear;
                        return (
                          <button
                            key={m.value}
                            onClick={() => handleSelectMonth(m.value)}
                            className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all relative flex flex-col items-center justify-center ${isSelected
                                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-600/20'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            <span>{m.label.slice(0, 3)}</span>
                            {isRealCurrent && !isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanatory Footer Tip & Export Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <button
                        onClick={() => {
                          setIsPickerOpen(false);
                          setIsSummaryModalOpen(true);
                        }}
                        className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors border border-emerald-200/80 dark:border-emerald-800/60"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {currentMonthLabel} {year} Summary (PDF)</span>
                      </button>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                        Active period controls all ledger &amp; budget data
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle Button (Light / Dark) */}
              <button
                onClick={toggleTheme}
                title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label="Toggle theme"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-center"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-fade-in" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600 animate-fade-in" />
                )}
              </button>

              {/* User Info & Logout */}
              {user ? (
                <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{user.name}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{user.currency}</div>
                  </div>
                  <button
                    onClick={logout}
                    title="Sign out"
                    className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Modern Mobile Bottom Navigation Bar (Fixed for Thumb-Friendly UX) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] transition-colors"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-950/60'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                  }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-emerald-600 dark:text-emerald-400' : ''}`} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[56px] text-center ${isActive ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-medium text-slate-500 dark:text-slate-400'
                  }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Monthly Summary PDF Modal */}
      <MonthlySummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        month={month}
        year={year}
      />
    </>
  );
};
