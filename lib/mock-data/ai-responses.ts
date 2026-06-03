import type { AIResponse } from "@/types";

export const AI_RESPONSES: AIResponse[] = [
  {
    triggers: ["net profit", "profit this month", "faida", "profit"],
    language: "en",
    response: `Your net profit after tax for October 2024 is **TZS 80,500,000** (9.5% margin). Compared to September 2024 (TZS 74.2M) this is **+8.5%** 📈. Revenue grew 12.4% to TZS 847.2M. Gross margin held steady at 50.6%.`,
    swahili: `Faida yako baada ya kodi kwa Oktoba 2024 ni **TZS 80,500,000** (asilimia 9.5). Ikilinganishwa na Septemba 2024 (TZS 74.2M), hii ni ongezeko la **+8.5%** 📈.`,
  },
  {
    triggers: ["cash position", "cash flow", "pesa", "fedha"],
    language: "en",
    response: `Combined cash position across all accounts is **TZS 312.8M**. CRDB Operating: TZS 198.4M · NMB Payroll: TZS 89.2M · Stanbic USD: $45,600 (~TZS 25.2M). Operating cash flow this period was TZS 81.4M positive — healthy runway of ~7 months of operating expenses covered.`,
    swahili: `Jumla ya fedha kwenye akaunti zote ni **TZS 312.8M**. CRDB: TZS 198.4M · NMB: TZS 89.2M · Stanbic USD: $45,600.`,
  },
  {
    triggers: ["overdue", "receivables", "ageing", "wadaiwa"],
    language: "en",
    response: `You have **TZS 89.4M in outstanding receivables**. Ageing breakdown: 0–30 days: TZS 54.2M · 31–60: TZS 22.1M · 61–90: TZS 9.4M · >90 days: TZS 3.7M. ⚠️ 7 invoices are overdue >60 days — total TZS 13.1M. I'd recommend prioritizing follow-up with Kariakoo Wholesale (TZS 4.8M overdue 78 days).`,
  },
  {
    triggers: ["vat", "tax", "kodi", "vat return"],
    language: "en",
    response: `**October 2024 VAT** return: Output VAT TZS 24.0M · Input VAT TZS 6.1M · Net payable to TRA: **TZS 17.9M**. Due date: 20 November 2024 (in 4 days ⏰). Filing has not yet been submitted — would you like me to prepare the return?`,
  },
  {
    triggers: ["payroll", "salaries", "mishahara"],
    language: "en",
    response: `October 2024 payroll summary (12 employees): Gross **TZS 18.0M** · PAYE TZS 3.2M · NSSF (employee) TZS 1.8M · SDL TZS 720k · WCF TZS 90k · Net pay **TZS 13.0M**. Statutory deadlines: PAYE/NSSF/SDL/WCF due 7 November. PAYE already filed ✅.`,
    swahili: `Mishahara ya Oktoba 2024 (wafanyakazi 12): Jumla **TZS 18.0M** · PAYE TZS 3.2M · NSSF TZS 1.8M · Mshahara wa mwisho **TZS 13.0M**.`,
  },
  {
    triggers: ["inventory", "stock", "low stock", "bidhaa"],
    language: "en",
    response: `Inventory snapshot: **80 SKUs · total value TZS 125.8M**. ⚠️ 12 items below reorder level (notably: Coffee Beans 1kg — 4 left vs 30 reorder · Cement 50kg — 6 left vs 40 reorder). Top movers this month: Rice Bag 25kg, Cooking Oil 5L. Inventory turnover: ~3.3x annualized.`,
  },
  {
    triggers: ["top customer", "best customer", "biggest customer"],
    language: "en",
    response: `Top 5 customers by revenue YTD: 1️⃣ Kariakoo Wholesale Ltd — TZS 218.6M · 2️⃣ Arusha Merchants — TZS 142.4M · 3️⃣ Mwanza Trading House — TZS 89.7M · 4️⃣ Zanzibar Import Export — TZS 76.2M · 5️⃣ Dodoma Supplies — TZS 64.1M. Top 5 = 70% of revenue (concentration risk worth monitoring).`,
  },
  {
    triggers: ["forecast", "projection", "next quarter"],
    language: "en",
    response: `Based on trailing 6 months and seasonal patterns, **Q1 2025 forecast**: Revenue TZS 232M (±8%) · Gross profit TZS 116M · Operating profit TZS 35M. Key assumptions: 11% YoY growth, stable cost-of-sales ratio (49.4%), no major customer churn. Sensitivity: −5% revenue → operating profit drops 22% (high operating leverage).`,
  },
  {
    triggers: ["health", "score", "ratings"],
    language: "en",
    response: `Financial Health Score: **74/100** (Strong). Component scores: Liquidity 82 · Profitability 78 · Efficiency 71 · Solvency 68 · Growth 75. Watch areas: solvency ratio (current 3.86 — healthy but trending down), AR ageing increasing 4 days vs prior quarter.`,
  },
  {
    triggers: ["habari", "mambo", "salamu", "jambo"],
    language: "sw",
    response: `Habari! Niko hapa kukusaidia na maswali yoyote kuhusu fedha za biashara yako. Unaweza kuniuliza kuhusu faida, kodi, mishahara, mauzo, au taarifa nyingine yoyote.`,
    swahili: `Habari! Niko hapa kukusaidia na maswali yoyote kuhusu fedha za biashara yako.`,
  },
  {
    triggers: ["mauzo", "sales swahili"],
    language: "sw",
    response: `Mauzo ya Oktoba 2024: **TZS 84.7M** (ongezeko la asilimia 4.1 kutoka Septemba). Wateja wakuu: Kariakoo Wholesale, Arusha Merchants. Bidhaa zinazoongoza: Mchele wa kg 25, Mafuta ya kupikia 5L.`,
  },
  {
    triggers: ["bajeti", "budget swahili"],
    language: "sw",
    response: `Hadi sasa mwaka huu, gharama za uendeshaji ziko **asilimia 96.3 ya bajeti** — ndani ya kikomo. Sehemu zinazohitaji uangalizi: gharama za usafiri (asilimia 104) na vifaa vya ofisi (asilimia 108).`,
  },

  // ============ Audit checkpoints ============
  {
    triggers: ["validity", "valid source", "valid document", "uthibitisho"],
    language: "en",
    response: `**Audit checkpoint — Validity**
A transaction is valid if it has a real, fiscalised supporting document.
For invoice **INV-2024-01007** (Arusha Merchants, TZS 8,400,000 net):
- Customer TIN on file ✅
- EFD receipt issued (EFD-2024-XXXXXXXX) ✅
- VAT 18% applied correctly (1,512,000) ✅
- Goods delivered, DN signed ✅
**Conclusion: VALID.** Sample more transactions for the same vendor to confirm pattern.`,
    swahili: `**Uthibitisho:** Muamala una hati ya msingi halali (EFD, TIN, DN). Inathibitishwa.`,
  },
  {
    triggers: ["authorisation", "authorization", "approval", "idhini", "ruhusa"],
    language: "en",
    response: `**Audit checkpoint — Authorisation**
Every committed expenditure must be approved at the right level.
Approval matrix in use:
- ≤ TZS 500k — Department head
- ≤ TZS 5M — Finance Manager
- > TZS 5M — CFO + board chair
Test: payment voucher **PV-2024-00214** (TZS 6.2M, generator service) — signed by Finance Manager only. **Exception** — required CFO co-sign.
Action: flag for management letter and confirm controls have been tightened.`,
    swahili: `**Idhini:** Kiwango cha idhini lazima kilingane na thamani. Hii ndiyo udhibiti muhimu wa kuzuia hasara.`,
  },
  {
    triggers: ["accuracy", "recompute", "recalculate", "usahihi"],
    language: "en",
    response: `**Audit checkpoint — Accuracy**
Recomputation of October 2024 PAYE deductions:
- 12 employees · Gross **TZS 18,000,000** · PAYE **TZS 3,200,000** posted
- Manual recompute using TRA 2024 bands (0% / 8% / 20% / 25% / 30%) yields TZS 3,184,500 — variance of **+15,500 (0.5%)** within rounding tolerance.
- NSSF (10% + 10%), SDL (4%), WCF (0.5%) all tie back to the gross.
**Conclusion: arithmetically accurate, within tolerance.** Flag only if variance >1%.`,
  },
  {
    triggers: ["documentation", "supporting documents", "evidence", "nyaraka"],
    language: "en",
    response: `**Audit checkpoint — Proper documentation**
For a procurement at TZS 6M, required documents (Tanzania purchase cycle):
1. Purchase Requisition (PR), approved
2. ≥ 3 proforma quotes
3. Supplier (tax) invoice — fiscalised, TIN, VAT #
4. Delivery Note (DN) — signed by receiving officer
5. Goods Received Note (GRN) — physical count
6. Payment Voucher (PV) — referencing PR, PO, GRN
7. EFD receipt from supplier
Missing any one of these is an **exception**. Walk this through Audit → Purchases for the live checklist.`,
    swahili: `**Nyaraka:** Manunuzi yanahitaji PR, proforma 3, ankara ya kodi, DN, GRN, PV, na EFD. Bila moja ni kasoro.`,
  },
  {
    triggers: ["tax compliance", "tra compliance", "uzingatiaji kodi"],
    language: "en",
    response: `**Audit checkpoint — Tax compliance**
For October 2024:
- VAT 18% applied on all taxable supplies ✅
- Output VAT TZS 24.0M reconciles to sales register ✅
- Input VAT TZS 6.1M supported by EFD receipts ✅
- PAYE filed by 7 Nov ✅ · SDL by 7 Nov ✅ · WCF by 7 Nov ✅
- VAT return due 20 Nov — **not yet filed** ⚠️
- TINs verified on top 10 customers — 10/10 valid
**Conclusion: compliant pending VAT filing in the next 4 days.** Reminder sent via in-app notification.`,
    swahili: `**Uzingatiaji wa kodi:** Filings za PAYE, NSSF, SDL, WCF zimewasilishwa. VAT inakaribia (Nov 20).`,
  },
  {
    triggers: ["recording", "classification", "coa", "chart of accounts", "uainishaji"],
    language: "en",
    response: `**Audit checkpoint — Correct recording**
A vehicle service expense of TZS 1.2M should hit account **5210 Motor Vehicle — Running** (Expense). Sample:
- Journal **JV-2024-00427**: debited **5210** correctly ✅
- But journal **JV-2024-00489** (similar transaction): debited **5240 Office Supplies** ❌ — **misclassification exception**.
Recommend a posting-rules sheet for the bookkeeper and consider account-pattern validation on the GL form.`,
    swahili: `**Uainishaji:** Akaunti ya GL lazima ilingane na asili ya muamala. Misclassification ni kasoro.`,
  },
];

export const AI_SUGGESTIONS_EN = [
  "What's my net profit this month?",
  "How is cash flow?",
  "Show me overdue invoices",
  "When is the next VAT return due?",
  "Forecast next quarter revenue",
  "Top customers this year",
  "What's our financial health score?",
  "Inventory items below reorder level",
  "Summarize October payroll",
];

export const AI_AUDIT_SUGGESTIONS = [
  "Is this transaction supported by a valid source document?",
  "Was this expenditure authorised at the right level?",
  "Recompute the totals and VAT for this transaction",
  "What documents are required for a TZS 6M procurement?",
  "Are PAYE and VAT filings up to date?",
  "Is the journal entry classified to the correct COA account?",
];

export const AI_SUGGESTIONS_SW = [
  "Faida yetu ni kiasi gani?",
  "Hali ya fedha ikoje?",
  "Onyesha ankara zilizochelewa",
  "VAT inayofuata ni lini?",
  "Tabiri mapato ya robo ijayo",
  "Wateja wakuu mwaka huu",
];
