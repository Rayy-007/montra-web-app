'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Trash2, Info, AlertCircle, X } from 'lucide-react';
import type { ToastVariant } from '../context/ToastContext';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    wrap: string;
    iconWrap: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  delete: {
    wrap: 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100',
    iconWrap: 'bg-rose-100 dark:bg-rose-900/80 text-rose-600 dark:text-rose-300',
    Icon: Trash2,
  },
  info: {
    wrap: 'bg-sky-50/95 dark:bg-sky-950/95 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-100',
    iconWrap: 'bg-sky-100 dark:bg-sky-900/80 text-sky-600 dark:text-sky-300',
    Icon: Info,
  },
  error: {
    wrap: 'bg-amber-50/95 dark:bg-amber-950/95 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100',
    iconWrap: 'bg-amber-100 dark:bg-amber-900/80 text-amber-600 dark:text-amber-300',
    Icon: AlertCircle,
  },
  success: {
    wrap: 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100',
    iconWrap: 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-emerald-300',
    Icon: CheckCircle2,
  },
};

/**
 * Renders active toast notifications into `document.body` so they appear above
 * modals, sticky headers, and overflow-hidden containers.
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0 || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      aria-live="polite"
      className="no-print fixed top-20 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none"
      style={{ position: 'fixed', top: '4.75rem', right: '1rem', zIndex: 99999 }}
    >
      {toasts.map((t) => {
        const { wrap, iconWrap, Icon } = VARIANT_STYLES[t.variant] || VARIANT_STYLES.success;
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center space-x-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl animate-toast-in ${wrap}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconWrap}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};
