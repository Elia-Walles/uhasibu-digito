import type { AuditStep, AuditProcedure } from "@/types";

// Audit procedure step definitions (reference configuration, not demo data). Drives the
// audit workpaper checklists and the audit Excel export.
export const AUDIT_STEPS: Record<AuditProcedure, AuditStep[]> = {
  Expenses: [
    {
      key: "exp_capture",
      title: "Initial capture",
      description: "Verify the expense was captured promptly and against a real supporting document.",
      evidence: [
        { label: "GL — expense entries", href: "/general-ledger" },
        { label: "Source receipt" },
      ],
    },
    {
      key: "exp_authorisation",
      title: "Authorisation at correct level",
      description: "Approval signature exists and is at the proper approval level for the amount.",
      evidence: [
        { label: "Approval matrix" },
        { label: "Audit trail", href: "/settings/audit-trail" },
      ],
    },
    {
      key: "exp_documentation",
      title: "Supporting documentation",
      description: "Receipt or invoice attached, matches the GL narration, vendor, and amount.",
      evidence: [
        { label: "Supplier register", href: "/procurement/suppliers" },
      ],
    },
    {
      key: "exp_gl",
      title: "Recorded against correct account",
      description: "Account code corresponds to the nature of the expense per the Chart of Accounts.",
      evidence: [
        { label: "Chart of Accounts", href: "/general-ledger/chart-of-accounts" },
      ],
    },
    {
      key: "exp_vat",
      title: "VAT treatment",
      description: "Input VAT recovered where applicable; non-recoverable items correctly expensed gross.",
      evidence: [
        { label: "VAT returns", href: "/tax/vat-returns" },
      ],
    },
    {
      key: "exp_tax",
      title: "Tax compliance",
      description: "WHT applied where required; EFD receipt obtained for purchases ≥ TZS 100,000.",
      evidence: [
        { label: "Tax calendar", href: "/tax/calendar" },
      ],
    },
  ],
  Purchases: [
    {
      key: "pur_pr",
      title: "Purchase requisition (PR)",
      description: "PR raised by a budget-holder, properly approved before any commitment to a supplier.",
      evidence: [
        { label: "Procurement", href: "/procurement" },
      ],
    },
    {
      key: "pur_proforma",
      title: "Proforma invoice",
      description: "At least one proforma quote received; multiple quotes for amounts above the threshold.",
      evidence: [
        { label: "Suppliers", href: "/procurement/suppliers" },
      ],
    },
    {
      key: "pur_supplier_inv",
      title: "Supplier (tax) invoice",
      description: "Fiscalised invoice with supplier TIN, VAT number, and matching PO reference.",
      evidence: [
        { label: "Purchase orders", href: "/procurement/purchase-orders" },
      ],
    },
    {
      key: "pur_dn",
      title: "Delivery note",
      description: "DN signed by warehouse / receiving officer; items match the supplier invoice.",
      evidence: [
        { label: "Stock movements", href: "/inventory/movements" },
      ],
    },
    {
      key: "pur_grn",
      title: "Goods received note (GRN)",
      description: "GRN raised, quantity and condition recorded; differences reconciled with supplier.",
      evidence: [
        { label: "Stock movements", href: "/inventory/movements" },
      ],
    },
    {
      key: "pur_pv",
      title: "Payment voucher",
      description: "PV prepared and approved; references PR + PO + GRN + supplier invoice.",
      evidence: [
        { label: "GL — payment entries", href: "/general-ledger" },
      ],
    },
    {
      key: "pur_efd",
      title: "EFD receipt",
      description: "EFD receipt issued by the supplier and filed; serial recorded in the GL narration.",
      evidence: [
        { label: "Banking", href: "/banking" },
      ],
    },
  ],
  Sales: [
    {
      key: "sal_quote",
      title: "Quotation",
      description: "Quotation issued, priced per the approved price list, and accepted by the customer.",
      evidence: [
        { label: "Quotations", href: "/sales/quotations" },
      ],
    },
    {
      key: "sal_po",
      title: "Customer purchase order",
      description: "Customer's PO received before order is fulfilled; PO matches the quotation.",
      evidence: [
        { label: "CRM customers", href: "/crm/customers" },
      ],
    },
    {
      key: "sal_so",
      title: "Sales order",
      description: "Internal sales order created from the customer PO; allocates stock and credit.",
      evidence: [
        { label: "Invoices", href: "/sales/invoices" },
      ],
    },
    {
      key: "sal_dn",
      title: "Delivery note",
      description: "Goods delivered, signed-for, and quantity matches the sales order.",
      evidence: [
        { label: "Stock movements", href: "/inventory/movements" },
      ],
    },
    {
      key: "sal_invoice",
      title: "Sales invoice (fiscalised)",
      description: "EFD invoice issued, VAT 18% applied, TIN of customer recorded if applicable.",
      evidence: [
        { label: "Invoices", href: "/sales/invoices" },
        { label: "Sent log", href: "/sales/sent-log" },
      ],
    },
    {
      key: "sal_receipt",
      title: "Receipt / proof of payment",
      description: "Customer payment received and reconciled to the invoice in the bank account.",
      evidence: [
        { label: "Payments", href: "/sales/payments" },
        { label: "Banking", href: "/banking" },
      ],
    },
  ],
};
