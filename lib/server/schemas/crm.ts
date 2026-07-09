import { z } from "zod";

const LEAD_STATUS = z.enum(["New", "Contacted", "Qualified", "Lost"]);
const DEAL_STAGE = z.enum(["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]);

// A budget line stores only its target (annual budget) and an optional GL account link; the
// month/year-to-date actuals are DERIVED LIVE from the ledger on read (see listBudgetLines).
export const createBudgetLineSchema = z.object({
  lineItem: z.string().trim().min(1, "Line item is required"),
  category: z.string().trim().min(1, "Category is required"),
  annualBudget: z.number().nonnegative(),
  coaAccountCode: z.string().trim().optional(),
});

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  company: z.string().trim().min(1, "Company is required"),
  phone: z.string().trim().default(""),
  email: z.string().trim().default(""),
  source: z.enum(["Web", "Referral", "Cold Call", "Social", "Walk-in"]),
  status: LEAD_STATUS.default("New"),
  temperature: z.enum(["Hot", "Warm", "Cold"]),
  assignedTo: z.string().trim().default(""),
  expectedValue: z.number().nonnegative().default(0),
  followUpDate: z.string().default(""),
});

export const updateLeadStatusSchema = z.object({
  id: z.string().min(1),
  status: LEAD_STATUS,
});

export const createDealSchema = z.object({
  dealName: z.string().trim().min(1, "Deal name is required"),
  companyName: z.string().trim().min(1, "Company is required"),
  contactName: z.string().trim().default(""),
  value: z.number().nonnegative().default(0),
  probability: z.number().int().min(0).max(100).default(0),
  stage: DEAL_STAGE.default("Lead"),
  assignedTo: z.string().trim().default(""),
  assignedInitials: z.string().trim().default(""),
  expectedCloseDate: z.string().default(""),
  daysInStage: z.number().int().nonnegative().default(0),
  notes: z.string().default(""),
});

export const moveDealSchema = z.object({
  id: z.string().min(1),
  stage: DEAL_STAGE,
});
