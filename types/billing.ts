// Serialized subscription-invoice shape shared by server actions, the PDF generator, the email
// template, and the client UI (money as number, dates as ISO strings).

export type SubscriptionInvoiceStatus = "unpaid" | "paid" | "cancelled";

export interface SubscriptionInvoiceView {
  id: string;
  number: string;
  planKey: string;
  planName: string;
  billingInterval: string;
  amountTzs: number;
  currency: string;
  status: SubscriptionInvoiceStatus;
  issuedAt: string; // ISO
  dueAt: string; // ISO
  submittedAt: string | null;
  paidAt: string | null;
  billToCompany: string;
  billToEmail: string;
  billToName: string;
}
