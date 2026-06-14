import { z } from "zod";

// All fields optional Settings → Company saves a partial patch.
export const updateCompanySchema = z.object({
  name: z.string().trim().min(1).optional(),
  shortName: z.string().trim().optional(),
  tin: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
  efdSerial: z.string().trim().optional(),
  nbaaNumber: z.string().trim().optional(),
  regNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  region: z.string().trim().optional(),
  businessType: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  financialYearStart: z.string().trim().optional(),
  financialYearEnd: z.string().trim().optional(),
  baseCurrency: z.string().trim().optional(),
  secondaryCurrency: z.string().trim().optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
