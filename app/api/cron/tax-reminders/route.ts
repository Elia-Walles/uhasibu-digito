import { NextResponse } from "next/server";
import type { TaxFiling } from "@prisma/client";
import { authDb } from "@/lib/server/auth-db";
import { sendMail, emailConfigured } from "@/lib/server/email";
import { taxReminderEmail } from "@/lib/server/email-templates";

// System scheduled job scans ALL tenants for tax filings due within 5 days and not yet
// filed, emails each tenant's owner a reminder (SMTP configured → send; otherwise →
// skip), and writes an AuditLog. Uses the RAW unscoped client (no request context).
// Gated by CRON_SECRET via the Bearer header (Vercel Cron sends this automatically).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const byTenant = new Map<string, TaxFiling[]>();
  for (const f of due) {
    const list = byTenant.get(f.tenantId) ?? [];
    list.push(f);
    byTenant.set(f.tenantId, list);
  }

  const smtp = emailConfigured();
  let sent = 0;

  for (const [tenantId, filings] of byTenant) {
    const owner = await authDb.user.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } });
    const recipient = owner?.email ?? "";
    const rowsHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:14px; color:#374151;">${filings
      .map(
        (f) =>
          `<tr><td style="padding:8px 0; border-bottom:1px solid #E5F0EC;"><strong style="color:#0A2318;">${f.type}</strong> · ${f.period}</td><td style="padding:8px 0; border-bottom:1px solid #E5F0EC; text-align:right; white-space:nowrap;">TZS ${Number(f.amount).toLocaleString()} · due ${f.dueDate.toISOString().split("T")[0]}</td></tr>`,
      )
      .join("")}</table>`;

    let delivered = false;
    if (recipient) {
      const { html, text } = taxReminderEmail(rowsHtml);
      delivered = await sendMail({
        to: recipient,
        subject: `Tax filings due within 5 days (${filings.length})`,
        html,
        text,
      });
      if (delivered) sent += 1;
    }

    await authDb.auditLog.create({
      data: {
        tenantId,
        userName: "system",
        action: "Reminded",
        module: "Tax",
        recordRef: filings.map((f) => f.id).join(","),
        ipAddress: "cron",
        details: `Tax reminder: ${filings.length} filing(s) due in ≤5 days${delivered ? " (email sent)" : smtp ? " (send failed)" : " (SMTP not configured)"}`,
      },
    });
  }

  return NextResponse.json({ scanned: due.length, tenants: byTenant.size, sent });
}
