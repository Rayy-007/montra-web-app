'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, currency?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('montra_token');
    const savedUser = localStorage.getItem('montra_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('montra_token');
        localStorage.removeItem('montra_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('montra_token', receivedToken);
    localStorage.setItem('montra_user', JSON.stringify(receivedUser));
  };

  const register = async (name: string, email: string, password: string, currency = 'MMK') => {
    const res = await api.post('/auth/register', { name, email, password, currency });
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('montra_token', receivedToken);
    localStorage.setItem('montra_user', JSON.stringify(receivedUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('montra_token');
    localStorage.removeItem('montra_user');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
