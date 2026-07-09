"use server";
import type { Lead as DbLead, PipelineDeal as DbDeal, BudgetLine as DbBudget } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { fiscalYearBounds } from "@/lib/server/fiscal";
import {
  createBudgetLineSchema,
  createLeadSchema,
  updateLeadStatusSchema,
  createDealSchema,
  moveDealSchema,
} from "@/lib/server/schemas/crm";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly, iso } from "@/lib/server/serialize";
import type {
  BudgetLine,
  Lead,
  LeadSource,
  LeadStatus,
  LeadTemperature,
  PipelineDeal,
  DealStage,
} from "@/types";

function rowToBudgetLine(r: DbBudget): BudgetLine {
  return {
    id: r.id,
    lineItem: r.lineItem,
    category: r.category,
    ...(r.coaAccountCode ? { coaAccountCode: r.coaAccountCode } : {}),
    annualBudget: decToNum(r.annualBudget),
    mtdBudget: decToNum(r.mtdBudget),
    mtdActual: decToNum(r.mtdActual),
    mtdVariance: decToNum(r.mtdVariance),
    ytdBudget: decToNum(r.ytdBudget),
    ytdActual: decToNum(r.ytdActual),
    ytdVariance: decToNum(r.ytdVariance),
  };
}

function rowToLead(r: DbLead): Lead {
  return {
    id: r.id,
    name: r.name,
    company: r.company,
    phone: r.phone,
    email: r.email,
    source: r.source as LeadSource,
    status: r.status as LeadStatus,
    temperature: r.temperature as LeadTemperature,
    assignedTo: r.assignedTo,
    expectedValue: decToNum(r.expectedValue),
    followUpDate: r.followUpDate ? dateOnly(r.followUpDate) : "",
    createdAt: iso(r.createdAt),
  };
}

function rowToDeal(r: DbDeal): PipelineDeal {
  return {
    id: r.id,
    dealName: r.dealName,
    companyName: r.companyName,
    contactName: r.contactName,
    value: decToNum(r.value),
    probability: r.probability,
    stage: r.stage as DealStage,
    assignedTo: r.assignedTo,
    assignedInitials: r.assignedInitials,
    expectedCloseDate: r.expectedCloseDate ? dateOnly(r.expectedCloseDate) : "",
    daysInStage: r.daysInStage,
    notes: r.notes,
  };
}

// ── Budget lines ────────────────────────────────────────────────────────────
/**
 * Budget lines with actuals DERIVED LIVE from the general ledger. A line linked to a COA account
 * takes its month/year-to-date actuals from that account's (and its children's) GL movement within
 * the current fiscal year; the YTD budget is the annual target prorated by months elapsed. Legacy
 * lines with no account link fall back to their stored figures.
 */
export async function listBudgetLines(): Promise<BudgetLine[]> {
  return withAuth(async () => {
    const rows = await db.budgetLine.findMany({ orderBy: { createdAt: "asc" } });
    if (rows.length === 0) return [];

    const company = await db.companyProfile.findFirst({ select: { fiscalYearStartMonth: true } });
    const now = new Date();
    const { fyStart } = fiscalYearBounds(now, company?.fiscalYearStartMonth ?? 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const accounts = await db.cOAAccount.findMany({ select: { code: true, type: true, parentCode: true } });
    const typeByCode = new Map(accounts.map((a) => [a.code, a.type]));
    const childrenOf = new Map<string, string[]>();
    for (const a of accounts) {
      if (!a.parentCode) continue;
      const list = childrenOf.get(a.parentCode) ?? [];
      list.push(a.code);
      childrenOf.set(a.parentCode, list);
    }

    const glRows = await db.gLEntry.findMany({
      where: { date: { gte: fyStart, lte: now } },
      select: { accountCode: true, debit: true, credit: true, date: true },
    });
    const ytdOwn = new Map<string, number>();
    const mtdOwn = new Map<string, number>();
    for (const r of glRows) {
      const type = typeByCode.get(r.accountCode);
      const debitNormal = type === "Asset" || type === "Expense" || type === "CostOfSales";
      const signed = debitNormal ? decToNum(r.debit) - decToNum(r.credit) : decToNum(r.credit) - decToNum(r.debit);
      ytdOwn.set(r.accountCode, (ytdOwn.get(r.accountCode) ?? 0) + signed);
      if (r.date >= monthStart) mtdOwn.set(r.accountCode, (mtdOwn.get(r.accountCode) ?? 0) + signed);
    }
    const rollup = (code: string, own: Map<string, number>, memo: Map<string, number>): number => {
      const cached = memo.get(code);
      if (cached !== undefined) return cached;
      let total = own.get(code) ?? 0;
      for (const child of childrenOf.get(code) ?? []) total += rollup(child, own, memo);
      memo.set(code, total);
      return total;
    };
    const ytdMemo = new Map<string, number>();
    const mtdMemo = new Map<string, number>();
    // Months elapsed in the current fiscal year (current month counts), clamped 1..12.
    const monthsElapsed = Math.min(12, Math.max(1, (now.getFullYear() - fyStart.getFullYear()) * 12 + (now.getMonth() - fyStart.getMonth()) + 1));

    return rows.map((r) => {
      const base = rowToBudgetLine(r);
      if (!r.coaAccountCode) return base;
      const annual = base.annualBudget;
      const ytdActual = rollup(r.coaAccountCode, ytdOwn, ytdMemo);
      const mtdActual = rollup(r.coaAccountCode, mtdOwn, mtdMemo);
      const ytdBudget = annual * (monthsElapsed / 12);
      const mtdBudget = annual / 12;
      return {
        ...base,
        mtdBudget,
        mtdActual,
        mtdVariance: mtdBudget - mtdActual,
        ytdBudget,
        ytdActual,
        ytdVariance: ytdBudget - ytdActual,
      };
    });
  });
}

export async function createBudgetLine(input: unknown): Promise<Result<BudgetLine>> {
  const parsed = createBudgetLineSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const created = await db.budgetLine.create({
      data: {
        tenantId: ctx.tenantId,
        lineItem: d.lineItem,
        category: d.category,
        annualBudget: d.annualBudget,
        ...(d.coaAccountCode ? { coaAccountCode: d.coaAccountCode } : {}),
      },
    });
    return ok(rowToBudgetLine(created));
  });
}

// ── Leads ───────────────────────────────────────────────────────────────────
export async function listLeads(): Promise<Lead[]> {
  return withAuth(async () => {
    const rows = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(rowToLead);
  });
}

export async function createLead(input: unknown): Promise<Result<Lead>> {
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const created = await db.lead.create({
      data: {
        tenantId: ctx.tenantId,
        name: d.name,
        company: d.company,
        phone: d.phone,
        email: d.email,
        source: d.source,
        status: d.status,
        temperature: d.temperature,
        assignedTo: d.assignedTo,
        expectedValue: d.expectedValue,
        followUpDate: d.followUpDate ? new Date(d.followUpDate) : null,
      },
    });
    return ok(rowToLead(created));
  });
}

export async function updateLeadStatus(input: unknown): Promise<Result<{ id: string; status: LeadStatus }>> {
  const parsed = updateLeadStatusSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, status } = parsed.data;
  return withAuth(async () => {
    await db.lead.updateMany({ where: { id }, data: { status } });
    return ok({ id, status });
  });
}

// ── Pipeline deals ────────────────────────────────────────────────────────────
export async function listDeals(): Promise<PipelineDeal[]> {
  return withAuth(async () => {
    const rows = await db.pipelineDeal.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(rowToDeal);
  });
}

export async function createDeal(input: unknown): Promise<Result<PipelineDeal>> {
  const parsed = createDealSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const created = await db.pipelineDeal.create({
      data: {
        tenantId: ctx.tenantId,
        dealName: d.dealName,
        companyName: d.companyName,
        contactName: d.contactName,
        value: d.value,
        probability: d.probability,
        stage: d.stage,
        assignedTo: d.assignedTo,
        assignedInitials: d.assignedInitials,
        expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate) : null,
        daysInStage: d.daysInStage,
        notes: d.notes,
      },
    });
    return ok(rowToDeal(created));
  });
}

export async function moveDeal(input: unknown): Promise<Result<{ id: string; stage: DealStage }>> {
  const parsed = moveDealSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, stage } = parsed.data;
  return withAuth(async () => {
    // Moving a deal resets its time-in-stage clock, matching the mock store's moveDeal.
    await db.pipelineDeal.updateMany({ where: { id }, data: { stage, daysInStage: 0 } });
    return ok({ id, stage });
  });
}
