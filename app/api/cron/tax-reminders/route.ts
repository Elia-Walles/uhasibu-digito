import { NextResponse } from "next/server";
import { Resend } from "resend";
import { authDb } from "@/lib/server/auth-db";

// System scheduled job — scans ALL tenants for tax filings due within 5 days and not yet
// filed, emails each tenant's owner a reminder (real Resend key → send; placeholder →
// simulate), and writes an AuditLog. Uses the RAW unscoped client (no request context).
// Gated by CRON_SECRET via the Bearer header (Vercel Cron sends this automatically).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY ?? "";
  return key.startsWith("re_") && !key.includes("REPLACE") && key.length > 20;
}

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 5 * 86_400_000);
  const due = await authDb.taxFiling.findMany({
    where: { status: { in: ["Pending", "Upcoming", "Overdue"] }, dueDate: { lte: horizon } },
    orderBy: { dueDate: "asc" },
  });

  const byTenant = new Map<string, typeof due>();
  for (const f of due) {
    const list = byTenant.get(f.tenantId) ?? [];
    list.push(f);
    byTenant.set(f.tenantId, list);
  }

  const resend = resendConfigured() ? new Resend(process.env.RESEND_API_KEY) : null;
  let sent = 0;

  for (const [tenantId, filings] of byTenant) {
    const owner = await authDb.user.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } });
    const recipient = owner?.email ?? "";
    const summary = filings
      .map((f) => `${f.type} ${f.period} — TZS ${Number(f.amount).toLocaleString()} due ${f.dueDate.toISOString().split("T")[0]}`)
      .join("; ");

    if (resend && recipient) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "Uhasibu Digito <no-reply@uhasibudigito.co.tz>",
          to: recipient,
          subject: `Tax filings due within 5 days (${filings.length})`,
          html: `<p>The following tax filings are due soon:</p><p>${summary}</p>`,
        });
        sent += 1;
      } catch {
        // delivery failure is non-fatal; the AuditLog below records the attempt
      }
    }

    await authDb.auditLog.create({
      data: {
        tenantId,
        userName: "system",
        action: "Reminded",
        module: "Tax",
        recordRef: filings.map((f) => f.id).join(","),
        ipAddress: "cron",
        details: `Tax reminder: ${filings.length} filing(s) due in ≤5 days${resend ? " (email sent)" : " (simulated — no Resend key)"}`,
      },
    });
  }

  return NextResponse.json({ scanned: due.length, tenants: byTenant.size, sent });
}
