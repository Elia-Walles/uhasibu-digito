import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/utils/password";

// Industry list for the onboarding "Business type" picker — alphabetical, "Other" last.
// Stored as a plain string (the picker also allows a custom "Other" value), so this drives
// the UI options only, not a DB enum.
export const BUSINESS_TYPES = [
  "Agriculture",
  "Automotive",
  "Construction",
  "Consulting",
  "Education",
  "Financial Services",
  "Food & Beverage",
  "Healthcare",
  "Hospitality",
  "Import/Export",
  "Logistics & Transport",
  "Manufacturing",
  "Media & Entertainment",
  "Mining",
  "NGO / Non-profit",
  "Pharmacy",
  "Professional Services",
  "Real Estate",
  "Restaurant",
  "Retail",
  "Services",
  "Technology",
  "Telecommunications",
  "Tourism & Travel",
  "Wholesale",
  "Other",
] as const;

// "Where did you hear from us" options — alphabetical, "Other" last. Free-text "Other" allowed.
export const HEARD_FROM_SOURCES = [
  "Advertisement",
  "Blog or Article",
  "Event or Conference",
  "Facebook",
  "Friend or Colleague",
  "Google Search",
  "Instagram",
  "LinkedIn",
  "Radio or TV",
  "Referral",
  "TikTok",
  "X (Twitter)",
  "YouTube",
  "Other",
] as const;

// International phone: optional, accepts empty, otherwise must be a valid number in any country
// (the onboarding PhoneField emits E.164 via libphonenumber-js).
const phoneField = z
  .union([
    z.literal(""),
    z.string().trim().refine((v) => isValidPhoneNumber(v), "Enter a valid phone number"),
  ])
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

// Post-login "complete registration" step. The remaining company fields (TIN, VAT, EFD,
// financial year…) stay editable in Settings → Company. businessType/heardFrom are free strings
// because the pickers allow a custom "Other" value.
export const onboardingProfileSchema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  companyName: z.string().trim().min(1, "Company name is required"),
  businessType: z.string().trim().min(1, "Select your business type"),
  country: z.string().trim().min(1, "Select your country"),
  countryCode: z.string().trim().min(2, "Country is required").max(2),
  region: z.string().trim().min(1, "Select your region"),
  district: z.string().trim().min(1, "Select your district"),
  street: z.string().trim().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  heardFrom: z.string().trim().optional(),
  phone: phoneField,
  phoneCountryCode: z.string().trim().optional(),
});

export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;

// Partial autosave: every field optional so a half-filled form can be persisted as the user types.
export const onboardingDraftSchema = onboardingProfileSchema.partial();

export type OnboardingDraftInput = z.infer<typeof onboardingDraftSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE),
});
