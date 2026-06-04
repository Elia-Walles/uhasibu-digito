import { z } from "zod";

export const updateTaxStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["Filed", "Pending", "Overdue", "Upcoming"]),
  filedAt: z.string().optional(),
});
