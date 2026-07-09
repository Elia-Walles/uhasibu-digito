import { z } from "zod";

export const setMatchedSchema = z.object({
  id: z.string().min(1),
  matched: z.boolean(),
});

export const reconcileSchema = z.object({
  bankAccountId: z.string().min(1),
});

export const createBankAccountSchema = z.object({
  bankName: z.string().trim().min(1, "Bank name is required"),
  accountName: z.string().trim().min(1, "Account name is required"),
  accountNumber: z.string().trim().default(""),
  currency: z.enum(["TZS", "USD", "EUR"]).default("TZS"),
  coaAccountCode: z.string().trim().min(1, "Link a general-ledger cash/bank account"),
  openingBalance: z.number().default(0), // in the account's own currency
  exchangeRate: z.number().positive().default(1), // account currency → TZS (1 for TZS accounts)
});

export const revalueFxSchema = z.object({
  bankAccountId: z.string().min(1),
  rate: z.number().positive("Enter the closing exchange rate"),
});

export const addStatementLineSchema = z.object({
  bankAccountId: z.string().min(1),
  date: z.string().min(1),
  description: z.string().trim().default(""),
  amount: z.number(), // signed: + inflow (credit), − outflow (debit)
  reference: z.string().trim().default(""),
});

export const importStatementLinesSchema = z.object({
  bankAccountId: z.string().min(1),
  lines: z.array(z.object({
    date: z.string().min(1),
    description: z.string().trim().default(""),
    amount: z.number(),
    reference: z.string().trim().default(""),
  })).min(1, "No statement lines found in the file"),
});
