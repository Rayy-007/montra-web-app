'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  X, 
  Download, 
  Printer, 
  Wallet, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  FileText,
  RotateCw
} from 'lucide-react';
import { formatMMK, MONTHS } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinancialContext';
import { Logo } from './Logo';
import api from '../lib/api';

interface MonthlySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: number;
  year: number;
}

export function MonthlySummaryModal({
  isOpen,
  onClose,
  month,
  year,
}: MonthlySummaryModalProps) {
  const { user } = useAuth();
  const { insights: ctxInsights, monthlyAccounts: ctxMonthlyAccounts } = useFinance();
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [reportData, setReportData] = useState<{
    accounts: any[];
    budgets: any;
    incomes: any;
    insights: any;
  } | null>(null);

  const monthLabel = MONTHS.find((m) => m.value === month)?.label || `Month ${month}`;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const fetchReportData = async () => {
      try {
        const [accRes, budgetRes, incomeRes, insightRes] = await Promise.allSettled([
          api.get(`/accounts/monthly?month=${month}&year=${year}`),
          api.get(`/budgets?month=${month}&year=${year}`),
          api.get(`/incomes?month=${month}&year=${year}`),
          api.get(`/insights/month?month=${month}&year=${year}`)
        ]);

        if (isMounted) {
          const accountsData = accRes.status === 'fulfilled' && Array.isArray(accRes.value.data)
            ? accRes.value.data
            : (ctxMonthlyAccounts && ctxMonthlyAccounts.length > 0 ? ctxMonthlyAccounts : []);

          const budgetsData = budgetRes.status === 'fulfilled' && budgetRes.value.data
            ? budgetRes.value.data
            : { categories: [], summary: {} };

          const incomesData = incomeRes.status === 'fulfilled' && incomeRes.value.data
            ? incomeRes.value.data
            : { items: [], summary: {} };

          const insightsData = insightRes.status === 'fulfilled' && insightRes.value.data
            ? insightRes.value.data
            : (ctxInsights || { actualInsight: {}, expectedInsight: {} });

          setReportData({
            accounts: accountsData,
            budgets: budgetsData,
            incomes: incomesData,
            insights: insightsData
          });
        }
      } catch (err) {
        console.error('Failed to load monthly summary data for report:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReportData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, month, year, ctxMonthlyAccounts, ctxInsights]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    if (!reportRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      const element = reportRef.current;
      let clonedSectionBounds: { top: number; bottom: number }[] = [];

      // Render the element to high-res canvas (2x DPI for razor-sharp typography)
      // windowWidth: 1024 guarantees that responsive classes render in desktop mode
      // even if the user initiates download on mobile phones.
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        onclone: (clonedDoc, clonedElement) => {
          // Standard A4 printable document width in pixels (800px corresponds to ~96 DPI A4 width)
          clonedElement.style.width = '800px';
          clonedElement.style.minWidth = '800px';
          clonedElement.style.maxWidth = '800px';
          clonedElement.style.padding = '36px';
          clonedElement.style.margin = '0 auto';
          clonedElement.style.boxSizing = 'border-box';
          clonedElement.style.backgroundColor = '#ffffff';

          // Force desktop flex on header
          const header = clonedElement.querySelector('.pdf-header') as HTMLElement;
          if (header) {
            header.style.display = 'flex';
            header.style.flexDirection = 'row';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.textAlign = 'left';
          }
          const headerRight = clonedElement.querySelector('.pdf-header-right') as HTMLElement;
          if (headerRight) {
            headerRight.style.textAlign = 'right';
          }

          // Force 4 columns on KPI cards
          const kpiGrid = clonedElement.querySelector('.pdf-kpi-grid') as HTMLElement;
          if (kpiGrid) {
            kpiGrid.style.display = 'grid';
            kpiGrid.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
            kpiGrid.style.gap = '14px';
          }

          // Expand all tables so horizontal scrollbars/cuts never happen in the PDF
          const tableWrappers = clonedElement.querySelectorAll('.overflow-x-auto');
          tableWrappers.forEach((tw) => {
            const el = tw as HTMLElement;
            el.style.overflow = 'visible';
            el.style.width = '100%';
          });

          const tables = clonedElement.querySelectorAll('table');
          tables.forEach((t) => {
            t.style.width = '100%';
          });

          // Measure section coordinates in 800px layout
          const clonedRect = clonedElement.getBoundingClientRect();
          const clonedSections = clonedElement.querySelectorAll('.pdf-section');
          clonedSectionBounds = [];
          clonedSections.forEach((sec) => {
            const r = sec.getBoundingClientRect();
            clonedSectionBounds.push({
              top: r.top - clonedRect.top,
              bottom: r.bottom - clonedRect.top,
            });
          });
        }
      });

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210; // A4 standard width in mm
      const pageHeight = 297; // A4 standard height in mm
      const marginX = 12; // mm
      const marginTop = 12; // mm
      const marginBottom = 12; // mm
      const contentWidth = pageWidth - (marginX * 2); // 186 mm
      const contentHeight = pageHeight - marginTop - marginBottom; // 273 mm

      // Canvas scale (canvas.width is at scale: 2 of 800px, so scale = canvas.width / 800)
      const scale = canvas.width / 800;
      const pxPerMm = canvas.width / contentWidth;
      const maxCanvasPageHeight = contentHeight * pxPerMm;

      // Calculate slice cut points without breaking through any section
      const cuts: { startY: number; endY: number }[] = [];
      let currentY = 0;

      while (currentY < canvas.height) {
        let targetEndY = currentY + maxCanvasPageHeight;

        if (targetEndY >= canvas.height) {
          cuts.push({ startY: currentY, endY: canvas.height });
          break;
        }

        // Check if targetEndY slices across any section
        let bestCutY = targetEndY;
        for (const bound of clonedSectionBounds) {
          const sectionTop = bound.top * scale;
          const sectionBottom = bound.bottom * scale;

          // If target cut falls within this section
          if (targetEndY > sectionTop && targetEndY < sectionBottom) {
            // Cut just before this section if there's enough room on this page
            if (sectionTop > currentY + (40 * scale)) {
              bestCutY = sectionTop - (6 * scale);
              break;
            }
          }
        }

        cuts.push({ startY: currentY, endY: bestCutY });
        currentY = bestCutY;
      }

      // Render each slice onto the PDF
      cuts.forEach((cut, index) => {
        const sliceHeight = cut.endY - cut.startY;
        if (sliceHeight <= 0) return;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;

        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0, cut.startY, canvas.width, sliceHeight,
            0, 0, canvas.width, sliceHeight
          );

          const sliceImgData = sliceCanvas.toDataURL('image/png');
          const sliceHeightMM = (sliceHeight * contentWidth) / canvas.width;

          if (index > 0) {
            pdf.addPage();
          }

          pdf.addImage(
            sliceImgData,
            'PNG',
            marginX,
            marginTop,
            contentWidth,
            sliceHeightMM,
            undefined,
            'FAST'
          );
        }
      });

      // Trigger instant direct file download
      const safeMonthName = monthLabel.replace(/\s+/g, '-');
      pdf.save(`Montra-Financial-Summary-${safeMonthName}-${year}.pdf`);
    } catch (err) {
      console.error('Failed to generate direct PDF download:', err);
      alert('Unable to generate PDF file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const accounts = reportData?.accounts || ctxMonthlyAccounts || [];
  const budgets = reportData?.budgets || { categories: [] };
  const incomes = reportData?.incomes || { items: [] };
  const insights = reportData?.insights || ctxInsights || {};

  // CRITICAL: Filter budgets strictly to those with plannedAmount > 0
  const setBudgetCategories = (budgets.categories || []).filter(
    (cat: any) => Number(cat.plannedAmount) > 0
  );

  // Income items support both backend schemas (`items` or `plans`)
  const incomeList: any[] = incomes.items || incomes.plans || [];

  // Totals for Initial Wallets Table
  const totalStartingBalance = accounts.reduce((sum: number, acc: any) => sum + (Number(acc.startingBalance) || 0), 0);
  const totalMonthlyIncome = accounts.reduce((sum: number, acc: any) => sum + (Number(acc.monthlyIncome) || 0), 0);
  const totalMonthlyExpense = accounts.reduce((sum: number, acc: any) => sum + (Number(acc.monthlyExpense) || 0), 0);
  const totalEndingBalance = accounts.reduce((sum: number, acc: any) => sum + (Number(acc.balance) || 0), 0);

  // Totals for Active Budgets
  const totalPlannedActiveBudget = setBudgetCategories.reduce(
    (sum: number, cat: any) => sum + Number(cat.plannedAmount || 0),
    0
  );
  const totalActualActiveBudgetExpense = setBudgetCategories.reduce(
    (sum: number, cat: any) => sum + Number(cat.actualExpense || 0),
    0
  );
  const totalActiveBudgetDiff = totalPlannedActiveBudget - totalActualActiveBudgetExpense;

  // Actual cashflow metrics with robust fallback to account totals
  const actualIncome = Number(
    insights?.actualInsight?.totalIncome ?? totalMonthlyIncome ?? 0
  );
  const actualExpense = Number(
    insights?.actualInsight?.totalExpense ?? totalMonthlyExpense ?? 0
  );
  const netSurplus = Number(
    insights?.actualInsight?.net ?? (actualIncome - actualExpense)
  );
  const totalLiquid = Number(
    insights?.totalWalletBalance ?? totalEndingBalance ?? 0
  );

  // Expense breakdown categories with fallback to budget actual expense
  const expenseBreakdown = (insights?.categoryBreakdown && insights.categoryBreakdown.length > 0)
    ? insights.categoryBreakdown
    : (budgets.categories || [])
        .filter((cat: any) => Number(cat.actualExpense) > 0)
        .map((cat: any) => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          color: cat.color || '#f43f5e',
          amount: Number(cat.actualExpense)
        }))
        .sort((a: any, b: any) => b.amount - a.amount);

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          {/* Top Sticky Toolbar (Hidden in Print) */}
          <div className="no-print sticky top-0 z-50 flex items-center justify-between px-3 sm:px-8 py-3 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 text-white shadow-lg">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-base font-bold text-white tracking-tight">
                  Monthly Statement Report
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  {monthLabel} {year} • Financial Summary
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Direct PDF Download Button */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={loading || isDownloading}
                className="py-2 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5 sm:space-x-2 disabled:opacity-50 cursor-pointer"
                title="Download PDF File"
              >
                {isDownloading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Download as PDF</span>
                    <span className="sm:hidden">Download PDF</span>
                  </>
                )}
              </button>

              {/* Optional Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={loading || isDownloading}
                className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors border border-slate-700 hidden md:flex items-center justify-center"
                title="Print Document"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                title="Close Report"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Report Content Container */}
          <div className="flex-1 p-3 sm:p-6 md:p-10 flex justify-center">
            {loading ? (
              <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 text-slate-300">
                <RotateCw className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-sm font-medium">Compiling {monthLabel} {year} summary report...</p>
              </div>
            ) : (
              /* A4 Printable Document Container captured by html2canvas */
              <div
                ref={reportRef}
                id="monthly-summary-printable"
                className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl p-4 sm:p-10 space-y-6 sm:space-y-8 my-auto border border-slate-200"
              >
                {/* Block 0: Document Header & Executive KPIs */}
                <div className="pdf-section space-y-6">
                  {/* Document Header */}
                  <div className="pdf-header flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
                    <div className="flex items-center space-x-3.5">
                      <Logo size={44} />
                      <div>
                        <div className="text-lg font-black tracking-tight text-slate-900">
                          MONTRA
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                          Modern Money Tracker
                        </div>
                      </div>
                    </div>

                    <div className="pdf-header-right text-left sm:text-right space-y-0.5">
                      <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Financial Summary
                      </div>
                      <div className="text-sm font-bold text-emerald-600">
                        {monthLabel} {year}
                      </div>
                      <div className="text-xs text-slate-500">
                        Generated: {currentDateStr} • User: {user?.name || 'Account Holder'}
                      </div>
                    </div>
                  </div>

                  {/* Executive KPI Performance Ribbon */}
                  <div className="pdf-kpi-grid grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 flex items-center space-x-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Total Income</span>
                      </div>
                      <div className="text-lg sm:text-xl font-black text-emerald-600">
                        {formatMMK(actualIncome)}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-500 flex items-center space-x-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Total Expense</span>
                      </div>
                      <div className="text-lg sm:text-xl font-black text-rose-600">
                        {formatMMK(actualExpense)}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Net Savings</span>
                      </div>
                      <div
                        className={`text-lg sm:text-xl font-black ${
                          netSurplus >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {formatMMK(netSurplus)}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 flex items-center space-x-1">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Total Liquid</span>
                      </div>
                      <div className="text-lg sm:text-xl font-black text-slate-900">
                        {formatMMK(totalLiquid)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Initial Wallets & Monthly Flow */}
                <div className="pdf-section space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>1. Wallets &amp; Starting Balances</span>
                    </h3>
                    <span className="text-xs text-slate-500">
                      Initial starting amount vs. closing
                    </span>
                  </div>

                  {accounts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Account Name</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3 text-right">Initial Balance</th>
                            <th className="py-2.5 px-3 text-right">Month Inflow (+)</th>
                            <th className="py-2.5 px-3 text-right">Month Outflow (-)</th>
                            <th className="py-2.5 px-3 text-right font-black">Ending Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {accounts.map((acc: any) => (
                            <tr key={acc.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{acc.name}</td>
                              <td className="py-2.5 px-3 text-slate-500 uppercase text-[10px]">{acc.type.replace('_', ' ')}</td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                {formatMMK(Number(acc.startingBalance) || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                                +{formatMMK(Number(acc.monthlyIncome) || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-rose-500">
                                -{formatMMK(Number(acc.monthlyExpense) || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {formatMMK(Number(acc.balance) || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-slate-900">
                          <tr>
                            <td colSpan={2} className="py-2 px-3 uppercase text-[10px] tracking-wider text-slate-500">
                              Total
                            </td>
                            <td className="py-2 px-3 text-right text-slate-800">
                              {formatMMK(totalStartingBalance)}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-600">
                              +{formatMMK(totalMonthlyIncome)}
                            </td>
                            <td className="py-2 px-3 text-right text-rose-600">
                              -{formatMMK(totalMonthlyExpense)}
                            </td>
                            <td className="py-2 px-3 text-right font-black">
                              {formatMMK(totalEndingBalance)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      No wallet accounts found for {monthLabel} {year}.
                    </div>
                  )}
                </div>

                {/* Section 2: Budget Allocation (ONLY Set Budgets) */}
                <div className="pdf-section space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                      <PieChartIcon className="w-4 h-4 text-indigo-600" />
                      <span>2. Active Budgets (Set Allocations Only)</span>
                    </h3>
                    <span className="text-xs text-slate-500">
                      Excluded categories with 0 MMK set amount
                    </span>
                  </div>

                  {setBudgetCategories.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Budget Category</th>
                            <th className="py-2.5 px-3 text-right">Planned Target</th>
                            <th className="py-2.5 px-3 text-right">Actual Spent</th>
                            <th className="py-2.5 px-3 text-right">Remaining Diff</th>
                            <th className="py-2.5 px-3 text-right">Usage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {setBudgetCategories.map((cat: any) => {
                            const isOver = cat.actualExpense > cat.plannedAmount;
                            return (
                              <tr key={cat.categoryId} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center space-x-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: cat.color || '#6366f1' }}
                                  />
                                  <span>{cat.categoryName}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                                  {formatMMK(cat.plannedAmount)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                                  {formatMMK(cat.actualExpense)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold">
                                  <span className={cat.diff >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                                    {formatMMK(cat.diff)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isOver
                                        ? 'bg-rose-100 text-rose-700'
                                        : cat.percentageUsed > 80
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {cat.percentageUsed}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-slate-900">
                          <tr>
                            <td className="py-2 px-3 uppercase text-[10px] tracking-wider text-slate-500">
                              Total Active Budgets
                            </td>
                            <td className="py-2 px-3 text-right font-black">
                              {formatMMK(totalPlannedActiveBudget)}
                            </td>
                            <td className="py-2 px-3 text-right text-rose-600 font-black">
                              {formatMMK(totalActualActiveBudgetExpense)}
                            </td>
                            <td className="py-2 px-3 text-right font-black">
                              <span className={totalActiveBudgetDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                                {formatMMK(totalActiveBudgetDiff)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {totalPlannedActiveBudget > 0
                                ? Math.round((totalActualActiveBudgetExpense / totalPlannedActiveBudget) * 100)
                                : 0}
                              %
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      No budget limits were set for {monthLabel} {year}.
                    </div>
                  )}
                </div>

                {/* Section 3: Income Streams Summary */}
                <div className="pdf-section space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>3. Incomes &amp; Revenue Streams</span>
                    </h3>
                    <span className="text-xs text-slate-500">
                      Expected vs. Deposited payouts
                    </span>
                  </div>

                  {incomeList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Revenue Source</th>
                            <th className="py-2.5 px-3 text-right">Expected Amount</th>
                            <th className="py-2.5 px-3 text-right">Actual Received</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {incomeList.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{p.source}</td>
                              <td className="py-2.5 px-3 text-right text-slate-600">{formatMMK(p.expectedAmount)}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatMMK(p.actualAmount)}</td>
                              <td className="py-2.5 px-3 text-right">
                                <span
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    p.status === 'RECEIVED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {p.status === 'RECEIVED' ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Received</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      <span>Expected</span>
                                    </>
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-slate-900">
                          <tr>
                            <td className="py-2 px-3 uppercase text-[10px] tracking-wider text-slate-500">
                              Total Income Streams
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-700">
                              {formatMMK(incomeList.reduce((sum, p) => sum + (Number(p.expectedAmount) || 0), 0))}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-emerald-600">
                              {formatMMK(incomeList.reduce((sum, p) => sum + (Number(p.actualAmount) || 0), 0))}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500 text-[10px]">
                              {incomeList.filter(p => p.status === 'RECEIVED').length} / {incomeList.length} Received
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      No income stream plans logged for {monthLabel} {year}.
                    </div>
                  )}
                </div>

                {/* Section 4: Expense Categories Breakdown */}
                <div className="pdf-section space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                      <span>4. Expense Breakdown by Category</span>
                    </h3>
                    <span className="text-xs text-slate-500">
                      Total: {formatMMK(actualExpense)}
                    </span>
                  </div>

                  {expenseBreakdown.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Expense Category</th>
                            <th className="py-2.5 px-3 text-right">Total Outflow</th>
                            <th className="py-2.5 px-3 text-right">Share of Outflow</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {expenseBreakdown.map((cb: any) => {
                            const percent = actualExpense > 0 ? Math.round((cb.amount / actualExpense) * 100) : 0;
                            return (
                              <tr key={cb.categoryId || cb.categoryName} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center space-x-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: cb.color || '#f43f5e' }}
                                  />
                                  <span>{cb.categoryName}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                  {formatMMK(cb.amount)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-slate-600">
                                  {percent}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      No expense transactions logged for {monthLabel} {year}.
                    </div>
                  )}
                </div>

                {/* Report Footer */}
                <div className="pdf-section pdf-footer pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
                  <div>
                    Generated by Montra Money Tracker • Confidential &amp; Private Document
                  </div>
                  <div className="text-right">
                    Statement ID: {year}-{String(month).padStart(2, '0')}-SUMMARY
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;
}
