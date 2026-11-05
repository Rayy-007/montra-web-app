'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface ProgressLoadingProps {
  message?: string;
  theme?: 'emerald' | 'indigo' | 'rose' | 'amber' | 'teal';
  compact?: boolean;
}

export const ProgressLoading: React.FC<ProgressLoadingProps> = ({
  message = 'Loading data...',
  theme = 'emerald',
  compact = false,
}) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Smooth realistic progress animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) return prev + Math.floor(Math.random() * 8) + 4;
        if (prev < 75) return prev + Math.floor(Math.random() * 5) + 2;
        if (prev < 92) return prev + Math.floor(Math.random() * 2) + 1;
        return prev;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  const themeStyles = {
    emerald: {
      bar: 'from-emerald-500 to-teal-400',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: 'text-emerald-600',
      track: 'bg-emerald-100/60',
    },
    indigo: {
      bar: 'from-indigo-500 to-purple-400',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: 'text-indigo-600',
      track: 'bg-indigo-100/60',
    },
    rose: {
      bar: 'from-rose-500 to-pink-400',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: 'text-rose-600',
      track: 'bg-rose-100/60',
    },
    amber: {
      bar: 'from-amber-500 to-orange-400',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: 'text-amber-600',
      track: 'bg-amber-100/60',
    },
    teal: {
      bar: 'from-teal-500 to-emerald-400',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: 'text-teal-600',
      track: 'bg-teal-100/60',
    },
  }[theme];

  return (
    <div
      className={`w-full flex flex-col items-center justify-center ${
        compact ? 'py-6 px-4' : 'py-14 px-6'
      } animate-fade-in`}
    >
      <div className="w-full max-w-sm space-y-3.5 bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
        {/* Header Icon & Message */}
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className={`w-4 h-4 animate-spin ${themeStyles.icon}`} />
          <span className="text-xs sm:text-sm font-semibold text-slate-700">
            {message}
          </span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${themeStyles.badge}`}
          >
            {Math.min(progress, 99)}%
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className={`w-full h-2.5 rounded-full overflow-hidden ${themeStyles.track}`}>
          <div
            className={`h-full rounded-full bg-gradient-to-r ${themeStyles.bar} transition-all duration-300 ease-out shadow-sm`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Subtle subtext */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
          <span>Connecting</span>
          <span>Syncing Cloud</span>
        </div>
      </div>
    </div>
  );
};
