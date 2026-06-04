"use server";
import type { Lead as DbLead, PipelineDeal as DbDeal, BudgetLine as DbBudget } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
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
export async function listBudgetLines(): Promise<BudgetLine[]> {
  return withAuth(async () => {
    const rows = await db.budgetLine.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(rowToBudgetLine);
  });
}

export async function createBudgetLine(input: unknown): Promise<Result<BudgetLine>> {
  const parsed = createBudgetLineSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const created = await db.budgetLine.create({ data: { tenantId: ctx.tenantId, ...d } });
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
