"use server";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import {
  setAuditStepSchema,
  resetProcedureSchema,
  updateEngagementSchema,
} from "@/lib/server/schemas/audit";
import { ok, err, type Result } from "@/lib/server/result";
import type {
  AuditEngagement,
  AuditProcedure,
  AuditProcedureState,
  AuditStepStatus,
} from "@/types";

// Mirrors DEFAULT_AUDIT_ENGAGEMENT in lib/store/dataStore.ts — used when a tenant has no
// engagement row yet (the seed creates one, but a freshly-registered company won't have it).
const DEFAULT_ENGAGEMENT = {
  name: "Kilimanjaro Trading — FY 2024 Audit",
  period: "01 Jan 2024 – 31 Dec 2024",
  auditorName: "Elia Mwangi",
} as const;

const EMPTY_PROCEDURES: AuditProcedure[] = ["Expenses", "Purchases", "Sales"];

export interface AuditSnapshot {
  engagement: AuditEngagement;
  results: Record<AuditProcedure, AuditProcedureState>;
}

export async function getAudit(): Promise<AuditSnapshot> {
  return withAuth(async (ctx) => {
    let eng = await db.auditEngagement.findFirst({ orderBy: { createdAt: "desc" } });
    if (!eng) {
      eng = await db.auditEngagement.create({ data: { tenantId: ctx.tenantId, ...DEFAULT_ENGAGEMENT } });
    }

    const rows = await db.auditStepResult.findMany();
    const results: Record<AuditProcedure, AuditProcedureState> = {
      Expenses: { results: {} },
      Purchases: { results: {} },
      Sales: { results: {} },
    };
    for (const r of rows) {
      const proc = r.procedure as AuditProcedure;
      if (EMPTY_PROCEDURES.includes(proc)) {
        results[proc].results[r.stepKey] = { status: r.status as AuditStepStatus, notes: r.notes };
      }
    }

    return {
      engagement: { name: eng.name, period: eng.period, auditorName: eng.auditorName },
      results,
    };
  });
}

export async function setAuditStep(input: unknown): Promise<Result<{ procedure: AuditProcedure; stepKey: string }>> {
  const parsed = setAuditStepSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { procedure, stepKey, status, notes } = parsed.data;
  return withAuth(async (ctx) => {
    const eng = await db.auditEngagement.findFirst({ orderBy: { createdAt: "desc" } });
    // The @@unique([tenantId, procedure, stepKey]) makes this idempotent — the same step
    // upserts in place as the auditor toggles status / edits notes.
    await db.auditStepResult.upsert({
      where: { tenantId_procedure_stepKey: { tenantId: ctx.tenantId, procedure, stepKey } },
      update: { status, notes },
      create: { tenantId: ctx.tenantId, engagementId: eng?.id ?? null, procedure, stepKey, status, notes },
    });
    return ok({ procedure, stepKey });
  });
}

export async function resetAuditProcedure(input: unknown): Promise<Result<{ procedure: AuditProcedure }>> {
  const parsed = resetProcedureSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { procedure } = parsed.data;
  return withAuth(async () => {
    await db.auditStepResult.deleteMany({ where: { procedure } });
    return ok({ procedure });
  });
}

export async function updateAuditEngagement(input: unknown): Promise<Result<AuditEngagement>> {
  const parsed = updateEngagementSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const p = parsed.data;
  return withAuth(async (ctx) => {
    const eng = await db.auditEngagement.findFirst({ orderBy: { createdAt: "desc" } });
    if (eng) {
      const data: { name?: string; period?: string; auditorName?: string } = {};
      if (p.name !== undefined) data.name = p.name;
      if (p.period !== undefined) data.period = p.period;
      if (p.auditorName !== undefined) data.auditorName = p.auditorName;
      const updated = await db.auditEngagement.update({ where: { id: eng.id }, data });
      return ok({ name: updated.name, period: updated.period, auditorName: updated.auditorName });
    }
    const created = await db.auditEngagement.create({
      data: {
        tenantId: ctx.tenantId,
        name: p.name ?? DEFAULT_ENGAGEMENT.name,
        period: p.period ?? DEFAULT_ENGAGEMENT.period,
        auditorName: p.auditorName ?? DEFAULT_ENGAGEMENT.auditorName,
      },
    });
    return ok({ name: created.name, period: created.period, auditorName: created.auditorName });
  });
}
