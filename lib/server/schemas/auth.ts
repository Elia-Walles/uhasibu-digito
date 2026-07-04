import { z } from "zod";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/utils/password";

export const BUSINESS_TYPES = ["Retail", "Restaurant", "Wholesale", "Services", "Other"] as const;

// Tanzanian mobile format shared by sign-up/onboarding: +255 7xx xxx xxx (spaces optional).
const phoneField = z
  .union([z.literal(""), z.string().trim().regex(/^\+255\s?7\d{2}\s?\d{3}\s?\d{3}$/, "Use format +255 7xx xxx xxx")])
  .optional();

// Sign-up now creates login credentials only email + password. Company/business details are
// captured after email verification in the onboarding wizard (onboardingProfileSchema).
export const registerCredentialsSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE),
});

export type RegisterCredentialsInput = z.infer<typeof registerCredentialsSchema>;

// The email link opens the code page; the page generates a code from this token.
export const generateCodeSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

// The user enters the copied 6-digit code on the /verify-email page to finish verifying.
export const verifyEmailCodeSchema = z.object({
  email: z.email("Enter a valid email address"),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const resendVerificationSchema = z.object({
  email: z.email("Enter a valid email address"),
});

// Post-login "complete registration" step (essentials only). The remaining company fields
// (TIN, VAT, EFD, address, financial year…) stay editable in Settings → Company.
export const onboardingProfileSchema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  companyName: z.string().trim().min(1, "Company name is required"),
  businessType: z.enum(BUSINESS_TYPES, { message: "Select your business type" }),
  region: z.string().trim().min(1, "Region is required"),
  phone: phoneField,
});

export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE),
});
