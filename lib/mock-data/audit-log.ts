import type { AuditLog, AuditAction } from "@/types";
import { rngFromSeed, pick, range, randomInt } from "./generators";

const rnd = rngFromSeed(13579);

const USERS = [
  { id: "usr_001", name: "Elia Mwangi" },
  { id: "usr_002", name: "Grace Mbeki" },
  { id: "usr_003", name: "Amina Hassan" },
  { id: "usr_004", name: "Samuel Kimani" },
  { id: "usr_005", name: "Lilian Ngowi" },
];

const MODULES = ["General Ledger","Invoices","Inventory","Payroll","Customers","Suppliers","Tax","Bank Reconciliation","Settings","Reports"];

const ACTIONS: AuditAction[] = ["Created","Modified","Deleted","LoggedIn","Exported","Stamped","Approved"];

const DETAILS: Record<AuditAction, string[]> = {
  Created: [
    "Created new invoice INV-2024-01057",
    "Created journal entry JV-2024-00218",
    "Added new customer 'Tarime Gold Co'",
    "Created PO PO-2024-00159",
  ],
  Modified: [
    "Updated invoice INV-2024-01029 status to Paid",
    "Modified employee EMP-007 salary",
    "Changed customer credit limit",
    "Updated COA account 6200",
  ],
  Deleted: [
    "Cancelled invoice INV-2024-01012",
    "Removed inactive supplier",
  ],
  LoggedIn: ["Logged in from 192.168.1.42"],
  Exported: [
    "Exported VAT return — PDF",
    "Exported Trial Balance — Excel",
    "Exported customer ageing — CSV",
  ],
  Stamped: [
    "Applied digital stamp to Income Statement Oct 2024",
    "Applied digital stamp to VAT Return Oct 2024",
  ],
  Approved: [
    "Approved payroll October 2024",
    "Approved journal entry batch",
  ],
};

export const AUDIT_LOG: AuditLog[] = range(50, (i) => {
  const user = pick(USERS, rnd);
  const action = pick(ACTIONS, rnd);
  const d = new Date(2024, 10, randomInt(1, 5, rnd), randomInt(8, 19, rnd), randomInt(0, 59, rnd));
  return {
    id: `log_${String(i + 1).padStart(4, "0")}`,
    timestamp: d.toISOString(),
    userId: user.id,
    userName: user.name,
    action,
    module: pick(MODULES, rnd),
    recordRef: `REF-${randomInt(1000, 9999, rnd)}`,
    ipAddress: `192.168.1.${randomInt(20, 250, rnd)}`,
    details: pick(DETAILS[action], rnd),
  };
}).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
