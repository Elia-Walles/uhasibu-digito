import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  contactPerson: z.string().trim().default(""),
  tin: z.string().trim().default(""),
  phone: z.string().trim().default(""),
  email: z.string().trim().default(""),
  city: z.string().trim().default(""),
  address: z.string().trim().default(""),
  creditLimit: z.number().nonnegative().default(0),
  paymentTerms: z.string().trim().default("30 days"),
  status: z.enum(["Active", "Inactive", "Blocked"]).default("Active"),
  country: z.string().optional(),
  swiftBic: z.string().optional(),
  beneficiaryBank: z.string().optional(),
  iban: z.string().optional(),
  isInternational: z.boolean().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
