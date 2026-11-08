'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(288, window.innerWidth - 24);

    // Calculate horizontal position: centered under button, clamped to screen margins
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (left < 12) left = 12;
    if (left + tooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - 12 - tooltipWidth;
    }

    // Calculate vertical position: below button, or above if close to bottom of screen
    let top = rect.bottom + 8;
    if (top + 100 > window.innerHeight && rect.top > 120) {
      top = Math.max(12, rect.top - 75);
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (!isOpen) return;

    calculatePosition();

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <span className={`inline-flex items-center ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          calculatePosition();
          setIsOpen((prev) => !prev);
        }}
        onMouseEnter={() => {
          calculatePosition();
          setIsOpen(true);
        }}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => {
          calculatePosition();
          setIsOpen(true);
        }}
        onBlur={() => setIsOpen(false)}
        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 transition-colors cursor-pointer"
        aria-label="More information"
        aria-expanded={isOpen}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{ top: coords.top, left: coords.left, maxWidth: 'calc(100vw - 24px)' }}
          className="fixed z-[99999] w-64 sm:w-72 p-2.5 sm:p-3 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-100 dark:text-slate-200 text-xs rounded-xl shadow-2xl border border-slate-700/60 dark:border-slate-700 leading-relaxed pointer-events-none font-normal animate-fade-in"
        >
          {content}
        </div>,
        document.body
      )}
    </span>
  );
}
