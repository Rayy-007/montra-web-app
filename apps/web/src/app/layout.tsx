import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';
import { FinancialProvider } from '../context/FinancialContext';
import { Navbar } from '../components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Montra - Modern Money Tracker',
  description: 'Smart personal finance & budget tracker replacing spreadsheets with live variance and insights.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <FinancialProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
                {children}
              </main>
            </div>
          </FinancialProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
