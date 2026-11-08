'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  className?: string;
  position?: 'bottom' | 'top';
}

export function InfoTooltip({ content, className = '', position = 'bottom' }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 transition-colors"
        aria-label="More information"
        aria-expanded={isOpen}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute left-0 sm:left-1/2 sm:-translate-x-1/2 z-50 w-64 sm:w-72 p-2.5 sm:p-3 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-100 dark:text-slate-200 text-xs rounded-xl shadow-xl border border-slate-700/60 dark:border-slate-700 leading-relaxed animate-fade-in pointer-events-none font-normal ${
            position === 'top'
              ? 'bottom-full mb-2'
              : 'top-full mt-2'
          }`}
        >
          {content}
          <div
            className={`absolute left-3 sm:left-1/2 sm:-translate-x-1/2 w-2 h-2 bg-slate-900/95 dark:bg-slate-800/95 border-slate-700/60 dark:border-slate-700 ${
              position === 'top'
                ? '-bottom-1 border-b border-r rotate-45'
                : '-top-1 border-t border-l rotate-45'
            }`}
          />
        </div>
      )}
    </div>
  );
}

