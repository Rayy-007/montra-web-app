# Montra - Money Tracker Web Application

> A modern full-stack Money Tracker designed as an elegant, high-precision replacement for manual Google Sheet trackers.

Built with **Next.js (App Router)**, **Node.js/Express (TypeScript) REST API**, and **PostgreSQL** with **Prisma ORM**.

---

## 🌟 Key Features

1. **Dual-Track Income Management (Expected vs Actual)**
   - Replaces the `💹 Income` section of your sheet.
   - Plan expected payouts (e.g. *Salary 7,000,000 MMK*, *Learnex Course 1,650,000 MMK*, *Investment Returns*).
   - Deposit received earnings directly into specific wallets (*Cash* or *Kpay*).
   - Real-time `Diff` calculation (Variance: realized vs expected).

2. **Monthly Budget Planner & Expense Ledger**
   - Replaces the `🔻 Expense` & `📈 Total Expense` sections of your sheet.
   - Pre-seeded with your personalized 16 categories:
     - *Parent, School Fees, Wifi & Meter, Fuel, Night Snacks, With Family, With Love, With Friends, Mine, Other Snacks, Others, Education, Savings, Investment, Savings with Love, Kpay*.
   - Live `Planned - Actual = Diff` tracking with color-coded budget consumption progress bars.

3. **Multi-Wallet / Account Management ("Where")**
   - Independent balances for **Cash**, **KBZPay (Kpay)**, Bank accounts, and Savings.
   - Monthly spending limits and automatic balance debiting/refunding upon transaction logging or deletion.

4. **Command Center Dashboard**
   - **Actual Insight**: Total Realized Income, Total Actual Expenses, Net Cashflow.
   - **Expected Insight**: Total Expected Income, Total Planned Budget, Projected Net.
   - Month/Year selector to navigate past and future financial records seamlessly.
   - Category breakdown charts and recent activity ledger.

5. **First-Class Myanmar Kyat (MMK) Localization**
   - Formatted thousands separators (e.g. `7,000,000 MMK`).

6. **Secure Multi-Tenant Authentication**
   - Built-in JWT authentication with `bcryptjs` password hashing.
   - Automatic pre-seeding of your default wallets and categories upon registration.

---

## 🚀 Quick Start Guide

### 1. Database Configuration
In `apps/api/.env`, ensure your PostgreSQL connection string is set (e.g. from Neon, Supabase, or local Postgres):
```env
PORT=5000
JWT_SECRET=your_jwt_secret_key
DATABASE_URL="postgresql://username:password@your-postgres-host/database?sslmode=require"
```

Push schema to your database:
```bash
pnpm db:push
```

### 2. Start the Backend API Server
```bash
pnpm dev:api
```
*API runs at http://localhost:5000 (Health check: http://localhost:5000/api/health)*

### 3. Start the Next.js Frontend
In a second terminal:
```bash
pnpm dev:web
```
*Frontend runs at http://localhost:3000*

---

## 📁 Project Structure

```
Montra-Web-App/
├── PLAN.md                   # Full architectural blueprint & schema specification
├── README.md                 # Project documentation & run guide
├── pnpm-workspace.yaml       # Workspace configuration
│
├── apps/
│   ├── api/                  # Express REST API (TypeScript)
│   │   ├── prisma/
│   │   │   └── schema.prisma # PostgreSQL Prisma schema
│   │   ├── src/
│   │   │   ├── modules/      # Auth, Accounts, Incomes, Budgets, Expenses, Insights
│   │   │   └── index.ts      # Server entrypoint
│   │   └── package.json
│   │
│   └── web/                  # Next.js 14 App Router Frontend
│       ├── src/
│       │   ├── app/          # Dashboard, Incomes, Expenses, Budgets, Wallets, Auth
│       │   ├── components/   # Navbar, Modals, Tables, Cards
│       │   ├── context/      # AuthContext & FinancialContext
│       │   └── lib/          # API client & MMK currency formatters
│       └── package.json
```
