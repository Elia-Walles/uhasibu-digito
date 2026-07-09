import { z } from "zod";

export const createExpenseSchema = z.object({
  date: z.string().min(1), // YYYY-MM-DD
  category: z.string().min(1, "Select an expense category"),
  payee: z.string().trim().default(""),
  description: z.string().trim().default(""),
  amount: z.number().positive("Amount must be greater than zero"),
  // Recoverable input VAT contained in `amount` (VAT-inclusive gross). 0 = no VAT.
  vatAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(["cash", "mpesa", "bank", "credit"]).default("bank"),
  reference: z.string().trim().default(""),
}).refine((d) => d.vatAmount <= d.amount, {
  message: "VAT can't exceed the total amount",
  path: ["vatAmount"],
});

export const deleteExpenseSchema = z.object({ id: z.string().min(1) });

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
