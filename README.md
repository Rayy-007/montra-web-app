# 🪙 Montra — Personal Finance & Money Tracker Web Application

> **A modern, high-precision personal finance tracking platform built as an elegant, automated replacement for manual Google Sheets.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.19-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](#license)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Main Features](#-main-features)
  - [1. Executive Command Center & Dashboard](#1-executive-command-center--dashboard)
  - [2. Dual-Track Income Management (Expected vs Actual)](#2-dual-track-income-management-expected-vs-actual)
  - [3. Dynamic Monthly Budget Planner](#3-dynamic-monthly-budget-planner)
  - [4. Multi-Account & Multi-Wallet Manager](#4-multi-account--multi-wallet-manager)
  - [5. Granular Expense & Transaction Ledger](#5-granular-expense--transaction-ledger)
  - [6. Monthly Financial Summary & PDF Export](#6-monthly-financial-summary--pdf-export)
  - [7. First-Class Localization (Myanmar Kyat - MMK)](#7-first-class-localization-myanmar-kyat---mmk)
  - [8. Security, Multi-Tenancy & Auto-Seeding](#8-security-multi-tenancy--auto-seeding)
  - [9. Dark & Light Theme System](#9-dark--light-theme-system)
- [Tech Stack](#-tech-stack)
- [Directory Structure](#-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository & Install Dependencies](#1-clone-repository--install-dependencies)
  - [2. Database & Environment Configuration](#2-database--environment-configuration)
  - [3. Run Database Migrations](#3-run-database-migrations)
  - [4. Start Development Servers](#4-start-development-servers)
  - [5. Building for Production](#5-building-for-production)
- [API Reference](#-api-reference)
- [Database Schema (Prisma)](#-database-schema-prisma)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔎 Overview

Manual spreadsheets often suffer from broken formulas, tedious duplicate entries, cumbersome multi-account reconciliation, and lack of real-time mobile optimization. **Montra** solves this by providing a robust, full-stack financial workspace designed around real-world money habits.

Montra bridges the gap between **what you expect to happen** (planned salary, projected consulting income, category budgets) and **what actually happens** (cleared wallet balances, spot expenses, incoming cashflow). With atomic balance reconciliations, customizable categories, month-by-month time navigation, and one-click PDF statements, Montra provides complete financial clarity in a frictionless modern UI.

---

## 🏗 System Architecture

Montra is structured as a clean TypeScript monorepo managed with **pnpm workspaces**:

```mermaid
flowchart TD
    subgraph Client["Frontend Client (apps/web)"]
        UI["Next.js 14 (App Router)"]
        AuthCtx["Auth Context (JWT + Storage)"]
        FinCtx["Financial Context (State & Sync)"]
        ThemeCtx["Theme Context (Dark/Light)"]
        Charts["Recharts Visualizations"]
        PDFGen["jsPDF & html2canvas Export"]
    end

    subgraph Server["Backend API (apps/api)"]
        Express["Express.js (TypeScript)"]
        AuthMW["JWT Authentication Middleware"]
        ZodVal["Zod Schema Validation"]
        Modules["REST Modules (Auth, Budgets, Incomes, Wallets, Transactions, Insights)"]
    end

    subgraph Database["Data Layer"]
        Prisma["Prisma ORM (v5)"]
        Postgres[("PostgreSQL (Neon / Supabase / Local)")]
    end

    UI --> FinCtx & AuthCtx & ThemeCtx
    FinCtx -->|Axios REST Client| Express
    Express --> AuthMW --> ZodVal --> Modules
    Modules --> Prisma
    Prisma --> Postgres
```

---

## ✨ Main Features

### 1. Executive Command Center & Dashboard
- **Dual Perspective Financial Health**:
  - **Actual Net**: Total Realized Inflow vs. Outflow with live net cashflow.
  - **Expected Net**: Projected Income vs. Planned Budget to measure monthly financial discipline.
- **Time Navigation**: Jump between any month and year to view historical ledgers or plan forward.
- **Visual Analytics**:
  - Interactive **Cashflow Comparison Bar Charts** (Income vs Expenses).
  - Categorical **Expense Distribution Pie Charts** powered by Recharts.
  - Quick glance consumption gauges for active category budgets.
- **Quick Action Triggering**: Direct modal shortcuts for logging expenses, setting budgets, receiving income, or viewing full monthly statements.

### 2. Dual-Track Income Management (Expected vs Actual)
- **Income Planning**: Map expected income streams (e.g. *Base Salary 7,000,000 MMK*, *Consulting / Course 1,650,000 MMK*, *Investment Dividends*).
- **Status Lifecycle Tracking**:
  - `EXPECTED`: Planned earnings awaiting arrival.
  - `PARTIAL`: Incomplete payouts received in milestone chunks.
  - `RECEIVED`: Realized income settled into your accounts.
- **Direct Wallet Destination**: When marking income as received, route funds directly into a selected wallet (*Cash*, *Kpay*, *Bank Account*), instantly crediting the account balance.
- **Variance Analysis**: Live calculation of income variances (`Expected - Actual = Diff`).

### 3. Dynamic Monthly Budget Planner
- **Category-Level Budgeting**: Allocate precise spending targets for every expense category per month.
- **Visual Budget Health Indicators**:
  - `🟢 Safe (0-75%)`: Healthy spending rate with emerald progress indicators.
  - `🟡 Warning (75-99%)`: Approaching spending cap with amber alerts.
  - `🔴 Overspent (100%+)`: Exceeded budget with crimson alerts and overflow calculations.
- **Clone Previous Month**: Duplicate past successful budgets into new months in one click to avoid re-typing recurring monthly plans.
- **Custom Category Allocations**: Add ad-hoc budget lines on the fly with custom naming, color badges, and Lucide icons.

### 4. Multi-Account & Multi-Wallet Manager
- **Multi-Type Asset Holding**:
  - `CASH`: Physical currency.
  - `MOBILE_WALLET`: KBZPay (Kpay), WavePay, and digital wallets.
  - `BANK`: Checking and savings accounts (e.g., AYA, KBZ, CB).
  - `SAVINGS`: High-yield or emergency reserve funds.
- **Month-Specific Starting Balances**: Configure individual starting balances for each account on any given month (`AccountMonthlyBalance`).
- **Real-Time Balance Calculation**: Computes live balances based on monthly opening balance plus logged deposits minus expenses.
- **Wallet Spending Limits**: Define optional monthly spending ceilings per account with proactive warning badges.

### 5. Granular Expense & Transaction Ledger
- **Atomic Balance Updates**: Deduct funds immediately upon expense entry; automatically rollback and refund wallet balances if an expense is edited or deleted.
- **Advanced Filtering & Search**:
  - Filter by Category (Parent, Education, Fuel, Snacks, etc.).
  - Filter by Account/Wallet (Cash vs. Kpay vs. Bank).
  - Filter by Date range and search by description notes.
- **Full Transaction Details**: Includes timestamp, wallet origin, category icon, description notes, and formatted MMK values.

### 6. Monthly Financial Summary & PDF Export
- **High-Fidelity Executive Statements**: Detailed modal synthesizing month-end totals, wallet balance shifts, category rankings, and variance reports.
- **Client-Side PDF Generation**:
  - Integrated `jspdf` and `html2canvas` generating crisp vector PDFs directly in the browser.
  - Instant print mode support for hard-copy filing or sharing.

### 7. First-Class Localization (Myanmar Kyat - MMK)
- Dedicated formatting utility for thousands separators (e.g. `7,000,000 MMK`).
- Seamless support for standard international numbers and currencies.

### 8. Security, Multi-Tenancy & Auto-Seeding
- **JWT Authentication**: Secure stateless token authentication stored securely with automatic request interception.
- **Password Security**: Strong password hashing using `bcryptjs` (salt factor 10).
- **Strict Data Isolation**: Every database query scoped strictly to the authenticated `userId`.
- **Automatic User Onboarding**:
  - Automatically seeds default wallets (*Cash*, *Kpay*).
  - Automatically seeds 16 essential expense categories (*Parent, School Fees, Wifi & Meter, Fuel, Night Snacks, With Family, With Love, With Friends, Mine, Other Snacks, Others, Education, Savings, Investment, Savings with Love, Kpay*).
  - Automatically seeds 4 income categories (*Salary, Learnex Course, Investment Return, Other Income*).

### 9. Dark & Light Theme System
- Integrated custom `ThemeContext` providing full theme switching across all views.
- Fully styled with Tailwind CSS dark variants for comfortable day and night usage.

---

## 🛠 Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 14](https://nextjs.org/) (App Router), [React 18](https://react.dev/) |
| **Styling & Icons** | [Tailwind CSS 3](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Charts & Visualization** | [Recharts 2](https://recharts.org/) |
| **Document Generation** | [jsPDF](https://github.com/parallax/jsPDF), [html2canvas](https://html2canvas.hertzen.com/) |
| **Backend Framework** | [Express 4](https://expressjs.com/), [TypeScript 5](https://www.typescriptlang.org/) |
| **ORM & Database** | [Prisma ORM 5](https://www.prisma.io/), [PostgreSQL](https://www.postgresql.org/) (Supports Neon, Supabase, Local) |
| **Validation & Security** | [Zod 3](https://zod.dev/), [JSON Web Tokens (JWT)](https://jwt.io/), [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Package Manager** | [pnpm](https://pnpm.io/) (Workspace monorepo) |

---

## 📂 Directory Structure

```text
Montra-Web-App/
├── package.json                   # Root scripts & monorepo orchestration
├── pnpm-workspace.yaml            # Monorepo workspace configuration
├── README.md                      # Project documentation
│
├── apps/
│   ├── api/                       # Express.js REST API
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Prisma schema (Models, Enums & Relations)
│   │   ├── src/
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts        # JWT verification middleware
│   │   │   ├── modules/
│   │   │   │   ├── accounts/      # Account & Wallet routes & calculations
│   │   │   │   ├── auth/          # Registration, login & profile routes
│   │   │   │   ├── budgets/       # Budget creation, cloning & variance routes
│   │   │   │   ├── categories/    # Category CRUD & user data seeder
│   │   │   │   ├── incomes/       # Dual-track income plan routes
│   │   │   │   ├── insights/      # Dashboard metrics & parallel summary aggregations
│   │   │   │   └── transactions/  # Ledger routes with balance reconciliation
│   │   │   ├── index.ts           # Express server bootstrap & route mounting
│   │   │   └── prisma.ts          # Prisma Client instance with Neon driver adapter
│   │   ├── .env.example           # API environment variables template
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                       # Next.js 14 App Router Frontend
│       ├── public/                # Static assets, icons and favicons
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/        # Login & Register views
│       │   │   ├── budgets/       # Monthly budget manager view
│       │   │   ├── dashboard/     # Command Center dashboard view
│       │   │   ├── expenses/      # Transaction ledger & expense manager
│       │   │   ├── incomes/       # Dual-track income manager
│       │   │   ├── wallets/       # Multi-account balances & limits view
│       │   │   ├── globals.css    # Tailwind CSS imports & theme styles
│       │   │   ├── layout.tsx     # Root HTML layout with context providers
│       │   │   └── page.tsx       # Root landing & navigation redirect
│       │   ├── components/        # Reusable UI components
│       │   │   ├── AddExpenseModal.tsx
│       │   │   ├── AddIncomeModal.tsx
│       │   │   ├── EditExpenseModal.tsx
│       │   │   ├── MonthlySummaryModal.tsx  # PDF export & statement modal
│       │   │   ├── Navbar.tsx               # Top navigational bar
│       │   │   ├── SetBudgetModal.tsx
│       │   │   └── Logo.tsx
│       │   ├── context/
│       │   │   ├── AuthContext.tsx          # User credentials & state
│       │   │   ├── FinancialContext.tsx     # Active month/year & shared finance data
│       │   │   └── ThemeContext.tsx         # Light/Dark mode state
│       │   └── lib/
│       │       ├── api.ts                   # Axios client with bearer tokens
│       │       └── utils.ts                 # MMK currency formatting & helpers
│       ├── package.json
│       ├── tailwind.config.ts
│       └── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.17.0` or higher (LTS recommended)
- **pnpm**: `v8.0.0` or higher (`npm install -g pnpm`)
- **PostgreSQL**: A running instance (Local PostgreSQL, [Neon Database](https://neon.tech/), or [Supabase](https://supabase.com/))

---

### 1. Clone Repository & Install Dependencies

```bash
git clone https://github.com/your-username/Montra-Web-App.git
cd Montra-Web-App

# Install all dependencies across both workspaces
pnpm install
```

---

### 2. Database & Environment Configuration

#### Backend API (`apps/api/.env`)
Create a `.env` file inside `apps/api/` based on `apps/api/.env.example`:

```bash
cp apps/api/.env.example apps/api/.env
```

Fill in your configuration:
```env
PORT=5000
JWT_SECRET="your_super_secret_jwt_key_here"

# Neon PostgreSQL connection string example:
DATABASE_URL="postgresql://username:password@ep-cool-frost-12345.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Or local PostgreSQL:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/montra_db?schema=public"
```

#### Frontend Client (`apps/web/.env.local`)
Create a `.env.local` file inside `apps/web/`:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

---

### 3. Run Database Migrations

Generate the Prisma Client and push your database schema directly to PostgreSQL:

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema directly to your PostgreSQL database
pnpm db:push
```

---

### 4. Start Development Servers

Run the backend API and Next.js frontend concurrently using root scripts:

#### Terminal 1 — Start the API Server
```bash
pnpm dev:api
```
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **API Root Info**: [http://localhost:5000](http://localhost:5000)

#### Terminal 2 — Start the Next.js Frontend
```bash
pnpm dev:web
```
- **Web Application**: [http://localhost:3000](http://localhost:3000)

Open [http://localhost:3000](http://localhost:3000) in your browser, register an account, and your default wallets and categories will be seeded automatically.

---

### 5. Building for Production

Compile both services for deployment:

```bash
# Build the TypeScript API server
pnpm build:api

# Build the Next.js Web App
pnpm build:web
```

To run in production mode:
```bash
# Run API (from apps/api)
pnpm --filter api start

# Run Web (from apps/web)
pnpm --filter web start
```

---

## 📡 API Reference

All protected endpoints require a valid JWT token sent in the `Authorization` header:  
`Authorization: Bearer <TOKEN>`

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user & automatically seeds default accounts and categories |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT bearer token |
| `GET` | `/api/auth/me` | Fetch currently authenticated user profile |

### Insights & Analytics (`/api/insights`)
| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/insights/monthly` | `month`, `year` | Returns high-performance parallel aggregates: actual net, expected net, category spending, account balances |

### Accounts & Wallets (`/api/accounts`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/accounts` | Fetch all user accounts/wallets |
| `GET` | `/api/accounts/monthly` | Fetch accounts with monthly-specific opening balance calculations |
| `POST` | `/api/accounts` | Create a new wallet/account |
| `PUT` | `/api/accounts/:id` | Update wallet name, type, and monthly spending limit |
| `POST` | `/api/accounts/monthly-balance` | Set or update the starting balance of an account for a given month |
| `DELETE` | `/api/accounts/:id` | Delete an account |

### Income Planner (`/api/incomes`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/incomes` | List monthly income plans with status (`EXPECTED`, `PARTIAL`, `RECEIVED`) |
| `POST` | `/api/incomes` | Create a new expected income record |
| `POST` | `/api/incomes/:id/receive` | Mark income as received and deposit directly into a chosen wallet |
| `PUT` | `/api/incomes/:id` | Update an existing income plan |
| `DELETE` | `/api/incomes/:id` | Delete an income plan |

### Budgets (`/api/budgets`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/budgets` | Fetch monthly category budget allocations with real-time actual spending and diffs |
| `POST` | `/api/budgets/items` | Set or update planned budget amount for a specific category |
| `POST` | `/api/budgets/custom` | Create a custom category and allocate a budget to it simultaneously |
| `POST` | `/api/budgets/copy-previous` | Copy entire budget structure from the previous month |
| `POST` | `/api/budgets/reset` | Clear all budget item allocations for a month |

### Transactions (`/api/transactions`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/transactions` | Query transactions with filters (`month`, `year`, `categoryId`, `accountId`, `type`) |
| `POST` | `/api/transactions` | Log an expense or income and automatically update wallet balance |
| `PUT` | `/api/transactions/:id` | Edit transaction amount/details and reconcile account balance difference |
| `DELETE` | `/api/transactions/:id` | Delete transaction and rollback corresponding wallet balance |

### Categories (`/api/categories`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/categories` | Retrieve all categories grouped by `EXPENSE` or `INCOME` |
| `POST` | `/api/categories` | Create a new category with custom icon and color |
| `PUT` | `/api/categories/:id` | Edit category attributes |
| `DELETE` | `/api/categories/:id` | Delete category |

---

## 🗄 Database Schema (Prisma)

```prisma
enum AccountType {
  CASH
  MOBILE_WALLET
  BANK
  SAVINGS
}

enum CategoryType {
  EXPENSE
  INCOME
}

enum TransactionType {
  EXPENSE
  INCOME
  TRANSFER
}

enum IncomeStatus {
  EXPECTED
  RECEIVED
  PARTIAL
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  name         String
  passwordHash String
  currency     String        @default("MMK")
  accounts     Account[]
  categories   Category[]
  transactions Transaction[]
  budgets      Budget[]
  incomePlans  IncomePlan[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model Account {
  id           String        @id @default(uuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String
  type         AccountType   @default(CASH)
  balance      Decimal       @default(0)
  budgetLimit  Decimal?
  transactions Transaction[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model Category {
  id           String        @id @default(uuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String
  type         CategoryType  @default(EXPENSE)
  icon         String?
  color        String?
  transactions Transaction[]
  budgetItems  BudgetItem[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model Transaction {
  id           String          @id @default(uuid())
  userId       String
  user         User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId    String
  account      Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  categoryId   String?
  category     Category?       @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  type         TransactionType @default(EXPENSE)
  amount       Decimal
  date         DateTime        @default(now())
  description  String?
  incomePlanId String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}

model Budget {
  id          String       @id @default(uuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  month       Int
  year        Int
  totalBudget Decimal      @default(0)
  items       BudgetItem[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([userId, month, year])
}

model BudgetItem {
  id            String   @id @default(uuid())
  budgetId      String
  budget        Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  categoryId    String
  category      Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  plannedAmount Decimal  @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([budgetId, categoryId])
}

model IncomePlan {
  id             String       @id @default(uuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  source         String
  expectedAmount Decimal      @default(0)
  actualAmount   Decimal      @default(0)
  expectedDate   DateTime?
  actualDate     DateTime?
  month          Int
  year           Int
  status         IncomeStatus @default(EXPECTED)
  description    String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the project repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
