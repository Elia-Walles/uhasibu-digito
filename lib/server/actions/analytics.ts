"use server";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { decToNum } from "@/lib/server/serialize";
import { getStatements } from "@/lib/server/actions/statements";
import type { TaxFiling } from "@/types";

export interface DashboardData {
  revenueMtd: number;
  salesToDate: number;
  cashPosition: number;
  receivables: number;
  netProfitFy: number;
  upcomingTax: TaxFiling[];
}

export async function getDashboard(): Promise<DashboardData> {
  return withAuth(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [bankAgg, custAgg, invoices, filings, statements] = await Promise.all([
      db.bankAccount.aggregate({ _sum: { balance: true } }),
      db.customer.aggregate({ _sum: { outstandingBalance: true } }),
      db.invoice.findMany({ select: { total: true, status: true, issueDate: true } }),
      db.taxFiling.findMany({
        where: { status: { in: ["Pending", "Upcoming", "Overdue"] } },
        orderBy: { dueDate: "asc" },
        take: 3,
      }),
      getStatements("FY"),
    ]);

    const counted = invoices.filter((i) => i.status !== "Draft" && i.status !== "Cancelled");
    const salesToDate = counted.reduce((s, i) => s + decToNum(i.total), 0);
    const revenueMtd = counted
      .filter((i) => i.issueDate >= monthStart)
      .reduce((s, i) => s + decToNum(i.total), 0);
    const netLine = statements.incomeStatement.find((l) => l.label === "Net profit");

    return {
      revenueMtd,
      salesToDate,
      cashPosition: decToNum(bankAgg._sum.balance ?? 0),
      receivables: decToNum(custAgg._sum.outstandingBalance ?? 0),
      netProfitFy: netLine?.current ?? 0,
      upcomingTax: filings.map((f) => ({
        id: f.id,
        type: f.type as TaxFiling["type"],
        period: f.period,
        dueDate: f.dueDate.toISOString().split("T")[0]!,
        amount: decToNum(f.amount),
        status: f.status as TaxFiling["status"],
        ...(f.filedAt ? { filedAt: f.filedAt.toISOString() } : {}),
      })),
    };
  });
}

export interface ManagementMetrics {
  revenue: number;
  netProfit: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

export async function getManagementMetrics(): Promise<ManagementMetrics> {
  return withAuth(async () => {
    const s = await getStatements("FY");
    const pick = (label: string) => s.incomeStatement.find((l) => l.label === label)?.current ?? 0;
    const revenue = pick("Revenue");
    const gross = pick("Gross profit");
    const operating = pick("Operating profit");
    const net = pick("Net profit");
    const pct = (n: number) => (revenue > 0 ? (n / revenue) * 100 : 0);
    return {
      revenue,
      netProfit: net,
      grossMargin: pct(gross),
      operatingMargin: pct(operating),
      netMargin: pct(net),
    };
  });
}
