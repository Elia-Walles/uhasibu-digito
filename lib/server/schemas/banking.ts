import { z } from "zod";

export const setMatchedSchema = z.object({
  id: z.string().min(1),
  matched: z.boolean(),
});

export const reconcileSchema = z.object({
  bankAccountId: z.string().min(1),
});
