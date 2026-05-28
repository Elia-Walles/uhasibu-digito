# CLAUDE.md — Uhasibu Digito Project Instructions

**This file is auto-loaded by Claude Code into every session in this directory. Every agent (main + sub-agents) MUST follow these rules.**

---

## 1. Project identity

- **Name**: Uhasibu Digito
- **Tagline**: *Akaunti yako, nguvu yako* (Your account, your power)
- **Purpose**: Tanzania's intelligent financial platform — 20 modules covering general ledger, financial statements, sales, inventory, CRM, procurement, payroll, tax, POS, fixed assets, banking, budgeting, AI assistant, reports
- **Mock company**: Kilimanjaro Trading Company Limited (TIN 123-456-789, VAT 40-123456-E)
- **Currency rule**: TZS (Tanzanian Shilling) ONLY everywhere. No `$` or `£` — except the single dedicated USD bank account (Stanbic).

---

## 2. Required skills & libraries

### `ui-ux-pro-max` skill
Invoke this **skill** when establishing a design system OR adding a brand-new UI pattern. Preset:
- Style: **minimal premium / Stripe-style**
- Mode: **light only**
- Responsive: **yes (full multi-device)**
- Generous whitespace, refined typography, subtle gradients, soft elevation shadows

It is a *skill*, not a runtime library. Don't expect to call it on every component edit. Globally installed — never install locally.

### Framer Motion (runtime library, used everywhere)
**Required motion patterns** — every component should pick from this catalog:
- Page transition (`PageWrapper`: fade + slide-y, 220ms)
- Number count-up on KPIs (`useCountUp`)
- Hover lift on cards: `whileHover={{ y: -2 }}` + shadow deepen
- Button: `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.97 }}`
- Stagger entrance: `staggerChildren: 0.05–0.07` on parent
- Sidebar active pill: shared `layoutId="sidebar-active-pill"`
- Tabs underline: shared `layoutId` on active underline
- Modal: scale + fade entrance with spring physics
- Skeleton shimmer: 1.4s infinite (defined in globals.css)
- Scroll-reveal: gate with `useInView({ once: true, margin: '-10% 0px' })`
- Stamp slam (flagship): scale 4→1, rotate -20→-3, spring

**Performance**: ALWAYS respect `prefers-reduced-motion`. Heavy effects (parallax, slam, confetti) degrade to fade-in. Parallax limited to login + dashboard hero only.

---

## 3. Stack constraints

| Constraint | Rule |
|---|---|
| Framework | Next.js **16** (App Router, async `params`/`searchParams`) |
| React | **19** |
| Styling | Tailwind **v4** — tokens in `@theme` block inside `app/globals.css`. **DO NOT create `tailwind.config.ts`** — v4 doesn't use it. |
| PostCSS | `@tailwindcss/postcss` (already in `postcss.config.mjs`) |
| TypeScript | strict + `exactOptionalPropertyTypes: true`. **Zero `any`, zero `@ts-ignore`.** |
| State | Zustand (`lib/store/`) |
| Icons | `lucide-react` |
| Charts | `recharts` (always wrap in `ResponsiveContainer`) |
| Date | `date-fns` |
| Class merge | `clsx` + `tailwind-merge` via `cn()` helper |

---

## 4. Design tokens (use these — never invent colors)

All exposed via `@theme` in `app/globals.css` as `--color-ud-*`. Use as `bg-ud-primary`, `text-ud-text-primary`, etc.

| Token | Hex | Purpose |
|---|---|---|
| `ud-primary` | `#0F7B5E` | Brand teal — trust/finance |
| `ud-primary-hover` | `#0D6B52` | Button hover |
| `ud-primary-light` | `#14A87E` | Gradient end |
| `ud-primary-glow` | `#1DD4A2` | Accent glow |
| `ud-primary-50` | `#E8F7F2` | Tint background |
| `ud-primary-100` | `#C8EDE2` | Soft tint |
| `ud-obsidian` | `#0A1F16` | Sidebar background |
| `ud-obsidian-2` | `#0D2B1E` | Sidebar hover row |
| `ud-obsidian-3` | `#112D22` | Sidebar active |
| `ud-gold` | `#F5C842` | Accent (sparingly) |
| `ud-gold-dark` | `#C47B2A` | Stamp/auditor gold |
| `ud-gold-50` | `#FFFBEB` | Gold tint bg |
| `ud-success` / `-bg` | `#059669` / `#ECFDF5` | Success/positive |
| `ud-warning` / `-bg` | `#D97706` / `#FFFBEB` | Warning |
| `ud-danger` / `-bg` | `#DC2626` / `#FEF2F2` | Danger/overdue |
| `ud-info` / `-bg` | `#2563EB` / `#EFF6FF` | Info |
| `ud-surface` | `#FFFFFF` | Card surface |
| `ud-surface-2` | `#F8FFFE` | Subtle tinted surface |
| `ud-surface-3` | `#F0FDF8` | Page background |
| `ud-border` | `#E5F0EC` | Hairline border |
| `ud-text-primary` | `#0A2318` | Primary text |
| `ud-text-secondary` | `#374151` | Secondary text |
| `ud-text-muted` | `#6B7280` | Muted |
| `ud-text-faint` | `#9CA3AF` | Faint/placeholder |

**Dark accent zones** (only these three pages get dark surfaces):
- Sidebar: `#0A1F16`
- POS page (`/pos`): `#0F1923`
- AI Assistant (`/ai-assistant`): `#0F1F17`

No global dark-mode toggle.

---

## 5. Typography rules

| Use case | Font | Weight |
|---|---|---|
| Page titles, section headers, KPI numbers | Plus Jakarta Sans (`font-display`) | 700–800 |
| Body text, UI labels, form inputs | DM Sans (`font-sans`, default) | 400–500 |
| **All TZS amounts in tables** | JetBrains Mono (`font-mono`) | 400–500 |

Additional rules:
- All TZS amounts in tables: `font-mono tabular-nums text-right`
- Negative amounts: `text-ud-danger` + wrapped in parentheses, e.g. `(123,456)`
- Small uppercase labels: `tracking-[0.08em] uppercase text-xs`
- Use `text-balance` utility on multi-line headings

---

## 6. Component reuse policy

**ALWAYS** check `components/ui/` before building a new primitive. Canonical components:

`Button` · `Badge` · `Input` · `StatCard` · `DigitalStamp` · `Skeleton`/`SkeletonText`/`SkeletonCard` · `DataTable` · `Modal` · `EmptyState` · `CurrencyDisplay` · `TrendBadge` · `PageHeader` · `FilterBar` · `ExportMenu` · `Select` · `Tooltip` · `ProgressBar` · `Steps` · `Tabs` · `Avatar` · `ConfirmDialog`

Layout components in `components/layout/`: `Sidebar` · `TopBar` · `MobileNav` · `PageWrapper`

If a needed primitive doesn't exist, ADD it to `components/ui/` — don't inline a one-off implementation in a page.

---

## 7. Skeleton loading rule

Every data-bearing page MUST show a skeleton matching its loaded shape for **≥800ms** via `useLoadingSimulation`. **Never use a spinner alone.** Skeletons live in `components/skeletons/`.

---

## 8. Responsive breakpoints (test all)

| Name | Width | Behavior |
|---|---|---|
| Mobile | <640 | Sidebar overlay; bottom MobileNav; KPIs 2-col; tables horizontal-scroll; modals full-screen; ≥44px touch targets |
| Large mobile | 640–767 | Same as mobile w/ larger padding |
| Tablet | 768–1023 | Sidebar 68px icon-only by default; KPIs 4-col |
| Laptop | 1024–1279 | Sidebar expanded 260px |
| Desktop | 1280–1535 | Reference design |
| Wide | ≥1536 (`3xl`) | `max-w-[1440px] mx-auto`; dashboard 4th column "Insights" |

**Must test at 375 / 768 / 1024 / 1440 minimum.** No horizontal page overflow at any width.

---

## 9. Tanzania-specific business rules

| Item | Value |
|---|---|
| PAYE bands (monthly TZS) | 0–270k: 0% · 270k–520k: 8% · 520k–760k: 20% · 760k–1M: 25% · >1M: 30% |
| NSSF (employee + employer) | 10% + 10% |
| SDL | 4% |
| WCF | 0.5% |
| HESLB (if applicable) | 2.5% |
| VAT | 18% |
| EFD number format | `EFD-YYYY-XXXXXXXX` |
| TIN format | `###-###-###` |
| Phone format | `+255 7xx xxx xxx` |
| Banks (mock) | CRDB, NMB, Stanbic, NBC |

PAYE/deductions logic lives in `lib/utils/paye.ts`. Always import from there — never reimplement.

---

## 10. Accessibility baseline

- Every Button/IconButton: `focus-visible:ring-2 ring-ud-primary ring-offset-2`
- Icon-only buttons: REQUIRED `aria-label`
- DataTable: semantic `<th scope="col">` + sr-only `<caption>`
- Modal: focus trap + `aria-labelledby` wired to title
- Toasts: `role="status"`
- Kanban cards: arrow-key navigation between columns
- Form inputs: proper `<label htmlFor>` association

---

## 11. State persistence

Mock data loads into Zustand `dataStore` on first read. Edits (new invoice, status change, payroll run) persist across navigation **in-memory** for the session. Resets on browser refresh — by design for a demo.

Static imports from `lib/mock-data/` are only the initial seed; reads in pages go through `dataStore` selectors.

---

## 12. Quality gates (before any "done" claim)

- [ ] `npx tsc --noEmit` clean (zero TypeScript errors)
- [ ] Zero `any`, zero `@ts-ignore`
- [ ] `npm run build` succeeds
- [ ] Skeleton appears on data-bearing pages
- [ ] Mobile (375px), tablet (768px), and desktop (1280px) all render without horizontal overflow
- [ ] All TZS in tables: `font-mono tabular-nums text-right`
- [ ] Destructive actions go through `ConfirmDialog`
- [ ] Empty states are never blank — icon + title + description + CTA

---

## 13. What NOT to do

- **DO NOT** create `tailwind.config.ts` (v4 doesn't use it; tokens go in `@theme`)
- **DO NOT** add a dark-mode toggle (light-only is the design contract)
- **DO NOT** invent colors outside the token set
- **DO NOT** hand-write large mock data arrays — use `lib/mock-data/generators.ts`
- **DO NOT** use `console.log` in production paths
- **DO NOT** write comments that just describe what code does
- **DO NOT** use heavy animation effects on mid-range devices without `prefers-reduced-motion` guards
- **DO NOT** reimplement primitives that already exist in `components/ui/`
- **DO NOT** use `any` or `@ts-ignore` — find the real type
