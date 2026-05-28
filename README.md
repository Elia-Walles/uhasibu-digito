# Uhasibu Digito

Tanzania's Intelligent Financial Platform — *Akaunti yako, nguvu yako*

## Tech stack

- Next.js 16 (App Router · Turbopack)
- React 19
- TypeScript 5 (strict + `exactOptionalPropertyTypes`)
- Tailwind CSS v4 (tokens in `@theme` inside `app/globals.css`)
- Framer Motion 12 (rich page/component motion)
- Recharts 3
- Zustand 4
- Radix UI primitives (Dialog, Dropdown, Select, Tabs, Tooltip, …)
- react-hot-toast (notifications)
- date-fns (formatting)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo login

- Email:    `demo@uhasibudigito.co.tz`
- Password: `Demo@2024`

## Project structure

- `app/` — Next.js App Router. `(auth)` group hosts login/register; `(app)` group hosts the authenticated shell.
- `components/ui/` — design-system primitives (Button, Badge, StatCard, DataTable, Modal, DigitalStamp, …).
- `components/charts/` — Recharts wrappers (Revenue, ExpenseDonut, CashFlow, HealthGauge, …).
- `components/layout/` — Sidebar, TopBar, MobileNav, PageWrapper.
- `components/skeletons/` — skeleton screens matching loaded page shapes.
- `lib/mock-data/` — all demo data (Tanzanian realism, deterministic generators).
- `lib/utils/` — currency, PAYE, dates, cn().
- `lib/hooks/` — useLoadingSimulation, useCountUp, useMediaQuery, …
- `lib/store/` — Zustand (authStore, appStore, dataStore).
- `lib/i18n/` — EN strings, future Swahili-ready.
- `types/` — every domain interface.

See [CLAUDE.md](./CLAUDE.md) for the full project conventions and design system reference.

## Modules implemented

**Tier 1 (flagship):** Dashboard · AI Assistant (full dark) · Payroll Run 5-step wizard · POS (full dark, M-Pesa) · Login · NBAA Digital Stamp.

**Tier 2 (full polish):** Financial Statements (4) · Invoices (list + new with live preview) · General Ledger (entries, journal-entry editor, Chart of Accounts, Trial Balance) · Inventory (overview, items grid/list, movements, stocktake wizard) · CRM (overview, customers, pipeline Kanban, leads) · Banking (accounts + reconciliation) · Tax (overview, VAT returns w/ stamp, PAYE, calendar) · Fixed Assets (register + depreciation).

**Tier 3 (functional):** Procurement (POs, suppliers) · Budgeting (overview + variance) · Reports Centre · Settings (Company, Users, Audit Trail, Preferences) · Management Accounts · Financial Modeling · Sales (Quotations, Payments).

## Tanzania-specific features

- **TRA VAT returns** — Output / Input / Net payable
- **PAYE** with 2024 TRA bands (0/8/20/25/30%)
- **NSSF** 10% employee + 10% employer
- **SDL** 4% · **WCF** 0.5% · **HESLB** 2.5% (conditional)
- **EFD / VFD** fiscal receipt simulation
- **Mobile money** payments (M-Pesa, Tigo Pesa, Airtel) at POS
- **NBAA Digital Audit Stamp** — flagship interaction
- **Swahili** language toggle in AI Assistant
- All currency: **TZS** (Tanzanian Shilling). USD only on dedicated USD bank account.

## Design system

Stripe-style minimal premium · light theme · dark accent zones on Sidebar, POS, AI Assistant only.

- Typography: Plus Jakarta Sans (display) · DM Sans (body) · JetBrains Mono (TZS in tables)
- Tokens: `--color-ud-*` exposed via `@theme` in [app/globals.css](./app/globals.css)
- Motion: page transitions, count-up KPIs, hover lifts, stagger entrances, layoutId pill, modal scale+fade, stamp slam, payroll confetti — all respect `prefers-reduced-motion`

## Verification

```bash
npx tsc --noEmit   # must pass
npm run build      # must succeed
```
