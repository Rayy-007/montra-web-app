'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
  textClassName?: string;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 36,
  className = '',
  withText = false,
  textClassName = '',
  href,
}) => {
  const logoIcon = (
    <div
      style={{ width: size, height: size }}
      className={`relative flex-shrink-0 rounded-xl overflow-hidden shadow-md shadow-emerald-500/20 transition-transform duration-200 hover:scale-105 ${className}`}
    >
      <svg
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          <linearGradient id="logoInnerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="logoMGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ecfdf5" />
          </linearGradient>
        </defs>

        {/* Squircle Background */}
        <rect width="512" height="512" rx="128" fill="url(#logoBgGrad)" />
        <rect
          width="504"
          height="504"
          x="4"
          y="4"
          rx="124"
          fill="none"
          stroke="url(#logoInnerGlow)"
          strokeWidth="8"
          opacity="0.6"
        />

        {/* Subtle decorative curves */}
        <path
          d="M64 380 Q 180 320 256 360 T 448 310"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeOpacity="0.15"
          strokeLinecap="round"
        />

        {/* Montra 'M' Glyph */}
        <path
          d="M120 376 V196 C120 180 134 168 150 168 C160 168 170 174 176 182 L256 288 L336 182 C342 174 352 168 362 168 C378 168 392 180 392 196 V376 C392 388 382 398 370 398 C358 398 348 388 348 376 V240 L278 334 C268 348 244 348 234 334 L164 240 V376 C164 388 154 398 142 398 C130 398 120 388 120 376 Z"
          fill="url(#logoMGrad)"
        />

        {/* Radiant Sparkle Star at Top Right */}
        <g transform="translate(372, 108)">
          <path
            d="M0 -42 C1 -12 12 -1 42 0 C12 1 1 12 0 42 C-1 12 -12 1 -42 0 C-12 -1 -1 -12 0 -42 Z"
            fill="#fef08a"
            opacity="0.95"
          />
          <circle cx="0" cy="0" r="8" fill="#ffffff" />
        </g>

        {/* Micro Sparkle Accent */}
        <g transform="translate(108, 140) scale(0.45)">
          <path
            d="M0 -36 C1 -10 10 -1 36 0 C10 1 1 10 0 36 C-1 10 -10 1 -36 0 C-10 -1 -1 -10 0 -36 Z"
            fill="#a7f3d0"
            opacity="0.8"
          />
        </g>
      </svg>
    </div>
  );

  const content = (
    <div className="flex items-center space-x-2.5">
      {logoIcon}
      {withText && (
        <span
          className={`font-black tracking-tight bg-gradient-to-r from-emerald-700 via-teal-600 to-teal-500 bg-clip-text text-transparent ${
            textClassName || 'text-xl'
          }`}
        >
          Montra
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
};

