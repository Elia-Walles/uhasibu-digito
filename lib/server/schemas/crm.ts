import { z } from "zod";

const LEAD_STATUS = z.enum(["New", "Contacted", "Qualified", "Lost"]);
const DEAL_STAGE = z.enum(["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]);

// Budget lines arrive fully computed from the page (mtd/ytd derived from annual + actual),
// so the action just persists what it's given — mirroring how useFixedAssets passes a whole
// domain object through.
export const createBudgetLineSchema = z.object({
  lineItem: z.string().trim().min(1, "Line item is required"),
  category: z.string().trim().min(1, "Category is required"),
  annualBudget: z.number().nonnegative(),
  mtdBudget: z.number(),
  mtdActual: z.number(),
  mtdVariance: z.number(),
  ytdBudget: z.number(),
  ytdActual: z.number(),
  ytdVariance: z.number(),
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
