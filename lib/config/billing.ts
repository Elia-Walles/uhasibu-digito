// Platform (seller) identity and bank-transfer details for subscription invoices.
// Centralized here so the invoice PDF, the on-screen invoice, and the email all stay in sync —
// edit these values in one place.

export const PLATFORM_SELLER = {
  name: "Uhasibu Digito Group",
  tagline: "Akaunti yako, nguvu yako",
  email: "support@uhasibudigito.co.tz",
  phone: "+255 778 587 735",
  website: "https://www.uhasibudigito.com",
  address: "Dar es Salaam, Tanzania",
} as const;

export const PLATFORM_BANK = {
  bankName: "NMB Bank",
  accountName: "UHASIBU DIGITO GROUP",
  accountNumber: "20510150481",
  accountType: "Current Account",
  bankType: "TZS Account",
} as const;

// A subscription invoice is due 24 hours after it is issued.
export const INVOICE_DUE_HOURS = 24;
