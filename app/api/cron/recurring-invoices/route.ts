import { NextResponse } from "next/server";
import { authDb } from "@/lib/server/auth-db";
import { runWithContext, type RequestContext } from "@/lib/server/request-context";
import { generateDueRecurring } from "@/lib/server/recurring-run";

// System scheduled job: scan ALL tenants for recurring-invoice templates whose next run is due,
// issue an invoice for each (posting it to the GL + VAT return like any other invoice) and advance
// the schedule. Uses the RAW unscoped client only to find which tenants have due work; the actual
// generation runs inside runWithContext so the scoped `db` binds each tenant. Bearer-gated by
// CRON_SECRET (Vercel Cron sends this automatically).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await authDb.recurringInvoice.findMany({
    where: { active: true, nextRunAt: { lte: now } },
    select: { tenantId: true },
  });
  const tenantIds = [...new Set(due.map((t) => t.tenantId))];

  let issued = 0;
  for (const tenantId of tenantIds) {
    const ctx: RequestContext = { tenantId, userId: "system", role: "Admin", branchId: null, userName: "Automation" };
    const r = await runWithContext(ctx, () => generateDueRecurring(ctx, now));
    issued += r.issued;
  }

  return NextResponse.json({ tenants: tenantIds.length, issued });
}
