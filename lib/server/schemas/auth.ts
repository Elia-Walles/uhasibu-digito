import { z } from "zod";

export const BUSINESS_TYPES = ["Retail", "Restaurant", "Wholesale", "Services", "Other"] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  companyName: z.string().trim().min(1, "Company name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z
    .union([z.literal(""), z.string().trim().regex(/^\+255\s?7\d{2}\s?\d{3}\s?\d{3}$/, "Use format +255 7xx xxx xxx")])
    .optional(),
  businessType: z.enum(BUSINESS_TYPES, { message: "Select your business type" }),
  region: z.string().trim().min(1, "Region is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
