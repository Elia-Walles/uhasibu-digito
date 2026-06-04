import { z } from "zod";

export const createAssetSchema = z.object({
  code: z.string().trim().default(""),
  name: z.string().trim().min(1, "Asset name is required"),
  category: z.enum(["Vehicle", "Equipment", "Building", "Computer", "Furniture"]),
  location: z.string().trim().default(""),
  acquisitionDate: z.string().min(1),
  cost: z.number().positive("Cost must be greater than zero"),
  residualValue: z.number().nonnegative().default(0),
  usefulLifeYears: z.number().int().nonnegative().default(0),
  depreciationMethod: z.enum(["StraightLine", "ReducingBalance"]).default("StraightLine"),
});

export const disposeAssetSchema = z.object({
  id: z.string().min(1),
  proceeds: z.number().nonnegative(),
  date: z.string().min(1),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
