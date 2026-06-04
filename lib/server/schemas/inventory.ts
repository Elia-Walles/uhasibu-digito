import { z } from "zod";

export const createItemSchema = z.object({
  code: z.string().trim().default(""),
  name: z.string().trim().min(1, "Item name is required"),
  category: z.string().trim().default(""),
  unit: z.string().trim().default("Each"),
  onHand: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(0),
  unitCost: z.number().nonnegative().default(0),
  sellingPrice: z.number().nonnegative().default(0),
  location: z.string().trim().default(""),
  supplier: z.string().trim().default(""),
  costingMethod: z.enum(["FIFO", "LIFO", "WeightedAverage"]).default("WeightedAverage"),
});

export const recordMovementSchema = z.object({
  itemId: z.string().min(1, "Pick an item"),
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]),
  quantity: z.number(),
  unitCost: z.number().nonnegative().default(0),
  narration: z.string().default(""),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type RecordMovementInput = z.infer<typeof recordMovementSchema>;
