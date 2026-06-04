import { z } from "zod";

export const journalLineSchema = z.object({
  accountCode: z.string().min(1, "Select an account"),
  accountName: z.string().default(""),
  description: z.string().default(""),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
});

export const postJournalSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required"),
  narration: z.string().default(""),
  date: z.string().min(1),
  lines: z.array(journalLineSchema).min(2, "A journal needs at least 2 lines"),
});

export const editJournalSchema = postJournalSchema;

export type PostJournalInput = z.infer<typeof postJournalSchema>;
