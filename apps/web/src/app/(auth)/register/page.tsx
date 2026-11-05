'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, AlertCircle, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Logo } from '../../../components/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, 'MMK');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Logo size={52} className="mx-auto shadow-lg shadow-emerald-500/25" />
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create your Montra account</h1>
          <p className="text-sm text-slate-500">
            Pre-configured with your Cash & Kpay wallets and personalized expense categories.
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-xs text-rose-600 bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Min"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-500" />
            <div>
              <strong>Smart Pre-Seeding:</strong> Your account will come pre-loaded with common expense categories (Food, Transport, Utilities, Housing, Entertainment, etc.) and a default wallet so you can start tracking immediately.
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
