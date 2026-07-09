import { describe, it, expect } from "vitest";
import { canPostFinancials, canClosePeriod, canManageBanking, canRunPayroll } from "@/lib/auth/roles";

describe("financial-action RBAC matrix", () => {
  it("post-roles may post journals/invoices/expenses; others can't", () => {
    for (const r of ["Admin", "CFO", "Finance Manager", "Accountant"] as const) expect(canPostFinancials(r)).toBe(true);
    for (const r of ["Auditor", "Data Entry", "HR Manager", "Cashier", "Branch Manager"] as const) expect(canPostFinancials(r)).toBe(false);
    expect(canPostFinancials(undefined)).toBe(false);
  });

  it("only senior finance may close the period / set opening balances", () => {
    for (const r of ["Admin", "CFO", "Finance Manager"] as const) expect(canClosePeriod(r)).toBe(true);
    for (const r of ["Accountant", "Auditor", "Data Entry"] as const) expect(canClosePeriod(r)).toBe(false);
  });

  it("banking roles may manage accounts; auditors and data-entry can't", () => {
    expect(canManageBanking("Accountant")).toBe(true);
    expect(canManageBanking("Auditor")).toBe(false);
    expect(canManageBanking("Data Entry")).toBe(false);
  });

  it("payroll may be run by finance + HR", () => {
    expect(canRunPayroll("HR Manager")).toBe(true);
    expect(canRunPayroll("Finance Manager")).toBe(true);
    expect(canRunPayroll("Accountant")).toBe(false);
    expect(canRunPayroll("Auditor")).toBe(false);
  });
});
