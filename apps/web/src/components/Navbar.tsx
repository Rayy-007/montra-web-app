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
  Sparkles,
  Calendar,
  Check,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinancialContext';
import { MONTHS } from '../lib/utils';
import { Logo } from './Logo';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { month, year, setMonth, setYear } = useFinance();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(year);
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

  // Generate 35 years: from 2020 to 2055 for robust long-term use
  const yearOptions = Array.from({ length: 36 }, (_, i) => 2020 + i);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
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
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Controls: Month/Year selector & User Profile */}
            <div className="flex items-center space-x-1.5 sm:space-x-3">
              {/* Interactive Month & Year Navigator */}
              <div className="relative" ref={pickerRef}>
                <div className="flex items-center bg-slate-100/90 hover:bg-slate-100 p-0.5 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-800 shadow-sm transition-all">
                  {/* Prev Month Chevron */}
                  <button
                    onClick={handlePrevMonth}
                    title="Previous Month"
                    className="p-1 sm:p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Current Active Month Display & Trigger */}
                  <button
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                    title="Click to change active budgeting month & year"
                    className="flex items-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 hover:bg-white rounded-lg transition-colors text-slate-800 font-bold"
                  >
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
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
                    className="p-1 sm:p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Month & Year Picker Popover Dialog */}
                {isPickerOpen && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-modal-slide">
                    {/* Popover Header: Year Stepper & Jump to Today */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setPickerYear(pickerYear - 1)}
                          title="Previous Year"
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Year Selector Dropdown for Long Term */}
                        <select
                          value={pickerYear}
                          onChange={(e) => setPickerYear(Number(e.target.value))}
                          className="font-black text-slate-900 text-sm bg-transparent cursor-pointer px-1 py-0.5 rounded-md hover:bg-slate-50 focus:outline-none"
                        >
                          {yearOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => setPickerYear(pickerYear + 1)}
                          title="Next Year"
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Today / Current Month Button */}
                      <button
                        onClick={handleGoToCurrentMonth}
                        title="Jump to current real-time month"
                        className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1"
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
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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

                    {/* Explanatory Footer Tip */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 text-center">
                      Active period controls all ledger &amp; budget data
                    </div>
                  </div>
                )}
              </div>

              {/* User Info & Logout */}
              {user ? (
                <div className="flex items-center space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-semibold text-slate-900 leading-tight">{user.name}</div>
                    <div className="text-[11px] text-slate-400">{user.currency}</div>
                  </div>
                  <button
                    onClick={logout}
                    title="Sign out"
                    className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
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
                    ? 'text-emerald-600 font-bold bg-emerald-50/80'
                    : 'text-slate-400 hover:text-slate-700 font-medium'
                  }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-emerald-600' : ''}`} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-600" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[56px] text-center ${isActive ? 'font-bold text-emerald-700' : 'font-medium text-slate-500'
                  }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
