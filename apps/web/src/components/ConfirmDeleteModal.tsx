'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, RotateCw } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  warningTitle?: string;
  warningText?: string;
  confirmLabel?: string;
  isDeleting?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Reusable custom confirmation dialog for delete actions across the app.
 */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  description,
  warningTitle = 'Please Note',
  warningText,
  confirmLabel = 'Delete',
  isDeleting = false,
  error = null,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[92vh] overflow-y-auto animate-modal-slide">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-500 dark:text-rose-400 mb-4 mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>

            {warningText && (
              <div className="mt-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl p-3 text-left space-y-1">
                <div className="font-bold flex items-center space-x-1.5 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{warningTitle}</span>
                </div>
                <p className="text-rose-600 dark:text-rose-400 leading-relaxed pl-5">
                  {warningText}
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-2.5 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{confirmLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
