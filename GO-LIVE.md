# Uhasibu Digito — Go-Live Runbook

Production launch checklist for the Tanzanian financial platform. The **General Ledger is the single
source of truth** — statements, reports, and the AI assistant all derive from `GLEntry`.

## 1. Environment variables

Set these in the deployment environment (Vercel project settings / `.env` for self-host):

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | TiDB/MySQL connection string (SSL enforced by the adapter) | ✅ |
| `AUTH_SECRET` | NextAuth session/JWT signing secret (`openssl rand -base64 32`) | ✅ |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Canonical base URL — used for the public invoice links in emails | ✅ |
| `EMAIL_SERVER_HOST` / `EMAIL_SERVER_PORT` / `EMAIL_SERVER_USER` / `EMAIL_SERVER_PASSWORD` / `EMAIL_FROM` | SMTP for invoice/verification/reminder emails. If unset, sends are skipped (not fatal). | ⚠️ recommended |
| `GEMINI_API_KEY` | Google Gemini key for the AI assistant. If unset, the assistant returns a 503. | ⚠️ optional |
| `CRON_SECRET` | Bearer secret guarding `/api/cron/*` (tax reminders, recurring invoices). Vercel Cron sends it automatically. | ✅ (for crons) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for document uploads | ⚠️ if uploads used |
| `SEED_OWNER_PASSWORD` / `SEED_ADMIN_PASSWORD` | Override the production seed passwords (never ship the dev fallbacks) | ✅ before seeding |
| `SEED_DEMO_PASSWORD` | Password for the optional demo tenant owner | optional |

## 2. Database & scheduled jobs

1. Apply the schema: `npx prisma db push` (or `prisma migrate deploy` with a migration).
2. Seed the production tenant + COA + plans: `SEED_OWNER_PASSWORD=… SEED_ADMIN_PASSWORD=… npm run db:seed`.
3. (Optional) Seed a self-contained demo tenant with live transactions: `npm run db:seed:demo`.
4. Confirm the two Vercel Crons are registered (`vercel.json`): `tax-reminders` (03:00) and `recurring-invoices` (02:00).

## 3. Per-tenant go-live steps (in the app)

For each real company, in order:

1. **Settings → Company** — set the legal name, TIN, VAT number, EFD serial, and the **fiscal-year start month**.
2. **General Ledger → Opening balances** — enter go-live balances; the `3900 Opening Balance Equity` plug balances the journal.
3. **Banking → Add account** — create each bank account linked to its GL cash account (1110–1150); enter the opening balance (and exchange rate for the USD/Stanbic account).
4. **Settings → Users** — invite staff with the right roles. Financial actions are **server-enforced** by role:
   - Post journals / issue invoices / record expenses / run payroll: **Admin, CFO, Finance Manager, Accountant** (payroll also **HR Manager**).
   - Close the year / opening balances / reconcile / revalue FX / reverse: **Admin, CFO, Finance Manager**.
   - **Auditor** is read-only; **Data Entry** may create drafts but not post; branch roles are POS/inventory only.
5. Configure **SMTP** and, if applicable, the **EFD serial** so invoices carry the fiscal receipt QR.

## 4. Pre-launch verification

- [ ] `npm run typecheck` clean · `npm run test` green · `npm run build` succeeds.
- [ ] Trial balance balances (Reports Centre → Trial Balance total debits = total credits).
- [ ] Issue + pay a test invoice → it posts to the GL, appears on the VAT return, and its PDF (with EFD QR) + public link open.
- [ ] Record a VAT expense → input VAT lands in `1250` and on the VAT return.
- [ ] Cash Flow statement's operating + investing + financing reconciles to the movement in cash.
- [ ] A non-finance role (Auditor / Data Entry) is blocked from posting a journal.
- [ ] Reports Centre downloads real Excel + CSV for each statement.
- [ ] After go-live setup, **close the prior year** to lock the books.

## 5. Notes

- Every money-moving action posts a balanced journal and writes an `AuditLog` entry; reversals are append-only (contra entries, originals preserved).
- Reports and the AI assistant read live GL data — no static figures.
- All financial cards display full grouped numbers (e.g. `90,000,000`), never abbreviations.
