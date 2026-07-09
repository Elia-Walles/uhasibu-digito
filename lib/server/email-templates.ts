import "server-only";
import { PLATFORM_BANK } from "@/lib/config/billing";
import { formatTZS } from "@/lib/utils/currency";
import type { SubscriptionInvoiceView } from "@/types/billing";

// Brand-styled, email-safe HTML for all transactional email. Email clients strip <style> and
// external assets, so everything here is a table layout with fully inline CSS and no remote images
// (the logo is a text wordmark). Colours mirror the design tokens in app/globals.css.

const TEAL = "#0F7B5E";
const TEAL_DARK = "#0D6B52";
const OBSIDIAN = "#0A1F16";
const TEXT = "#0A2318";
const MUTED = "#6B7280";
const BORDER = "#E5F0EC";
const PAGE_BG = "#F0FDF8";
const CARD_BG = "#FFFFFF";

// Prisma/edge-safe year without relying on Date.now() bans elsewhere this is server-only.
function currentYear(): number {
  return new Date().getFullYear();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface EmailContent {
  html: string;
  text: string;
}

interface RenderInput {
  /** Short hidden preview line shown by inboxes next to the subject. */
  preheader?: string;
  heading: string;
  /** Intro paragraph(s) as plain text (rendered as <p>). */
  intro: string;
  /** Optional extra HTML block (already-safe markup) placed under the intro. */
  bodyHtml?: string;
  button?: { label: string; url: string };
  footerNote?: string;
  /** Plain-text alternative body (falls back to `intro`). */
  text?: string;
}

/**
 * Wrap content in the Uhasibu Digito branded shell. Returns both `html` and a `text` fallback.
 */
export function renderEmail(input: RenderInput): EmailContent {
  const { preheader, heading, intro, bodyHtml = "", button, footerNote } = input;
  const year = currentYear();

  const buttonHtml = button
    ? `
      <tr>
        <td align="left" style="padding: 8px 0 4px;">
          <a href="${button.url}" target="_blank"
             style="display:inline-block; background:${TEAL}; background-image:linear-gradient(135deg,${TEAL},${TEAL_DARK}); color:#ffffff; text-decoration:none; font-weight:700; font-size:15px; line-height:20px; padding:13px 26px; border-radius:12px; font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
            ${escapeHtml(button.label)}
          </a>
        </td>
      </tr>`
    : "";

  const fallbackLink = button
    ? `
      <tr>
        <td style="padding: 16px 0 0; font-size:12px; line-height:18px; color:${MUTED}; font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${button.url}" target="_blank" style="color:${TEAL}; word-break:break-all;">${escapeHtml(button.url)}</a>
        </td>
      </tr>`
    : "";

  const noteHtml = footerNote
    ? `<tr><td style="padding: 18px 0 0; font-size:12px; line-height:18px; color:${MUTED}; font-family:'Segoe UI',Helvetica,Arial,sans-serif;">${footerNote}</td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0; padding:0; background:${PAGE_BG};">
  ${preheader ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG}; padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:100%; background:${CARD_BG}; border:1px solid ${BORDER}; border-radius:20px; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:${OBSIDIAN}; background-image:linear-gradient(135deg,${OBSIDIAN},#0D2B1E); padding:22px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:19px; font-weight:800; color:#ffffff; letter-spacing:-0.2px;">
                    Uhasibu&nbsp;Digito
                  </td>
                </tr>
                <tr>
                  <td style="font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:12px; color:#1DD4A2; padding-top:2px;">
                    Akaunti yako, nguvu yako
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:34px 32px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:22px; line-height:28px; font-weight:800; color:${TEXT}; padding-bottom:12px;">
                    ${escapeHtml(heading)}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#374151; padding-bottom:${button || bodyHtml ? "20px" : "0"};">
                    ${escapeHtml(intro)}
                  </td>
                </tr>
                ${bodyHtml ? `<tr><td style="padding-bottom:${button ? "20px" : "0"};">${bodyHtml}</td></tr>` : ""}
                ${buttonHtml}
                ${fallbackLink}
                ${noteHtml}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px; border-top:1px solid ${BORDER}; background:${PAGE_BG};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:12px; line-height:18px; color:${MUTED};">
                    &copy; ${year} Uhasibu Digito&trade; &middot; Made in Tanzania<br/>
                    This is an automated message please do not reply.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    input.text ?? intro,
    button ? `\n${button.label}: ${button.url}` : "",
    footerNote ? `\n${footerNote.replace(/<[^>]+>/g, "")}` : "",
    `\n\n© ${year} Uhasibu Digito · Made in Tanzania`,
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

/** Email verification the button opens the code-generation page. */
export function verificationEmail(codePageUrl: string): EmailContent {
  return renderEmail({
    preheader: "Get your verification code to activate your Uhasibu Digito account.",
    heading: "Verify your email",
    intro:
      "Karibu Uhasibu Digito! To activate your account, get your verification code and enter it on the verification page. The button below opens a secure page that generates your code.",
    button: { label: "Get verification code", url: codePageUrl },
    footerNote: "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",
  });
}

/** Password reset. */
export function passwordResetEmail(name: string | null, resetUrl: string): EmailContent {
  return renderEmail({
    preheader: "Reset your Uhasibu Digito password.",
    heading: "Reset your password",
    intro: `${name ? `Hello ${name}, ` : ""}we received a request to reset your password. Click the button below to choose a new one.`,
    button: { label: "Reset my password", url: resetUrl },
    footerNote: "This link expires in one hour. If you didn't request this, you can safely ignore this email.",
  });
}

/** Staff invitation: the owner added this person to their company; they set their own password. */
export function staffInviteEmail(input: {
  name: string | null;
  companyName: string;
  roleLabel: string;
  branchName?: string;
  inviteUrl: string;
}): EmailContent {
  const where = input.branchName ? ` at ${input.branchName}` : "";
  return renderEmail({
    preheader: `You've been added to ${input.companyName} on Uhasibu Digito.`,
    heading: `You've been invited to ${input.companyName}`,
    intro: `${input.name ? `Hi ${input.name}, ` : ""}you've been added to ${input.companyName} on Uhasibu Digito as ${input.roleLabel}${where}. Set your password to sign in and get started.`,
    button: { label: "Set your password", url: input.inviteUrl },
    footerNote: "This invitation link expires in one hour. If you weren't expecting this, you can ignore this email.",
  });
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Dar_es_Salaam",
  }).format(new Date(iso));
}

/** Subscription invoice (bank transfer). The PDF is attached separately by the caller. */
export function subscriptionInvoiceEmail(input: {
  invoice: SubscriptionInvoiceView;
  invoiceUrl: string;
}): EmailContent {
  const { invoice, invoiceUrl } = input;
  const amount = formatTZS(invoice.amountTzs);
  const cell = `font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:14px; line-height:20px; padding:8px 0; border-bottom:1px solid ${BORDER};`;
  const labelCell = `${cell} color:${MUTED};`;
  const valueCell = `${cell} color:${TEXT}; font-weight:600; text-align:right;`;

  const summary = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
      <tr><td style="${labelCell}">Invoice number</td><td style="${valueCell}">${escapeHtml(invoice.number)}</td></tr>
      <tr><td style="${labelCell}">Plan</td><td style="${valueCell}">${escapeHtml(invoice.planName)} (1 ${escapeHtml(invoice.billingInterval)})</td></tr>
      <tr><td style="${labelCell}">Amount due</td><td style="${valueCell}">${escapeHtml(amount)}</td></tr>
      <tr><td style="${labelCell}">Due date</td><td style="${valueCell}">${escapeHtml(formatDateTime(invoice.dueAt))}</td></tr>
      <tr><td style="${labelCell}">Status</td><td style="${valueCell}; color:#D97706;">UNPAID</td></tr>
    </table>
    <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; color:${TEXT}; text-transform:uppercase; letter-spacing:0.06em; padding:6px 0 8px;">Pay by bank transfer</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG}; border:1px solid ${BORDER}; border-radius:12px;">
      <tr><td style="padding:14px 16px; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:14px; line-height:22px; color:${TEXT};">
        <strong>Bank:</strong> ${escapeHtml(PLATFORM_BANK.bankName)}<br/>
        <strong>Account name:</strong> ${escapeHtml(PLATFORM_BANK.accountName)}<br/>
        <strong>Account number:</strong> ${escapeHtml(PLATFORM_BANK.accountNumber)}<br/>
        <strong>Account type:</strong> ${escapeHtml(PLATFORM_BANK.accountType)}<br/>
        <strong>Bank type:</strong> ${escapeHtml(PLATFORM_BANK.bankType)}<br/>
        <strong>Payment reference:</strong> ${escapeHtml(invoice.number)}
      </td></tr>
    </table>`;

  return renderEmail({
    preheader: `Invoice ${invoice.number} — pay by bank transfer to activate your account.`,
    heading: "Your subscription invoice",
    intro: `Thank you for choosing Uhasibu Digito. Your invoice is attached as a PDF. Please pay the amount below by bank transfer using your invoice number as the reference. Your account will be activated once we confirm your payment.`,
    bodyHtml: summary,
    button: { label: "View my invoice", url: invoiceUrl },
    footerNote: "This invoice is due within 24 hours. If you've already paid, no further action is needed — we'll activate your account shortly.",
  });
}

/** A simple label/value summary table in the branded style (reused by the payment emails). */
function summaryTable(rows: Array<[string, string]>): string {
  const cell = `font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:14px; line-height:20px; padding:8px 0; border-bottom:1px solid ${BORDER};`;
  const labelCell = `${cell} color:${MUTED};`;
  const valueCell = `${cell} color:${TEXT}; font-weight:600; text-align:right;`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">${rows
    .map(([l, v]) => `<tr><td style="${labelCell}">${escapeHtml(l)}</td><td style="${valueCell}">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;
}

/** Receipt sent to a CUSTOMER when their invoice payment is recorded. */
export function paymentReceiptEmail(input: { invoiceNumber: string; amountPaid: number; balanceDue: number; companyName: string; publicLink?: string }): EmailContent {
  const paidInFull = input.balanceDue <= 0.01;
  const summary = summaryTable([
    ["Invoice", input.invoiceNumber],
    ["Amount received", formatTZS(input.amountPaid)],
    ["Balance due", paidInFull ? "Paid in full" : formatTZS(input.balanceDue)],
  ]);
  return renderEmail({
    preheader: `We've received your payment for invoice ${input.invoiceNumber}.`,
    heading: "Payment received — thank you",
    intro: `Thank you for your payment to ${input.companyName}. We've recorded the amount below against invoice ${input.invoiceNumber}.`,
    bodyHtml: summary,
    ...(input.publicLink ? { button: { label: "View invoice", url: input.publicLink } } : {}),
    footerNote: "Please keep this email as your receipt.",
  });
}

/** Alert to a PLATFORM super-admin when a tenant submits a bank-transfer payment for approval. */
export function paymentSubmittedAdminEmail(input: { tenantName: string; invoiceNumber: string; amountTzs: number; reviewUrl: string }): EmailContent {
  const summary = summaryTable([
    ["Tenant", input.tenantName],
    ["Invoice", input.invoiceNumber],
    ["Amount", formatTZS(input.amountTzs)],
  ]);
  return renderEmail({
    preheader: `${input.tenantName} submitted a subscription payment awaiting approval.`,
    heading: "A payment is awaiting your approval",
    intro: `${input.tenantName} has marked invoice ${input.invoiceNumber} as paid by bank transfer. Review it and approve to activate their account.`,
    bodyHtml: summary,
    button: { label: "Review & approve", url: input.reviewUrl },
    footerNote: "You're receiving this as a Uhasibu Digito platform administrator.",
  });
}

/** Confirmation to a TENANT when an admin approves their payment and activates the account. */
export function subscriptionApprovedEmail(input: { companyName: string; planName: string; periodEnd: string; dashboardUrl: string }): EmailContent {
  const summary = summaryTable([
    ["Plan", input.planName],
    ["Status", "Active"],
    ["Renews on", formatDateTime(input.periodEnd)],
  ]);
  return renderEmail({
    preheader: "Your payment is confirmed — your account is now active.",
    heading: "Payment confirmed — you're all set",
    intro: `Great news, ${input.companyName}! We've confirmed your bank transfer and your Uhasibu Digito account is now active on the ${input.planName} plan.`,
    bodyHtml: summary,
    button: { label: "Go to my dashboard", url: input.dashboardUrl },
    footerNote: "Thank you for choosing Uhasibu Digito.",
  });
}

/** Notice to a TENANT when an admin cancels their subscription invoice. */
export function subscriptionCancelledEmail(input: { companyName: string; invoiceNumber: string; selectPlanUrl: string }): EmailContent {
  return renderEmail({
    preheader: `Subscription invoice ${input.invoiceNumber} was cancelled.`,
    heading: "Your subscription invoice was cancelled",
    intro: `Hello ${input.companyName}, invoice ${input.invoiceNumber} has been cancelled. If this was unexpected, or you'd like to continue, you can pick a plan again below.`,
    button: { label: "Choose a plan", url: input.selectPlanUrl },
    footerNote: "If you've already paid, please contact support and we'll sort it out.",
  });
}

/** A customer invoice ("here is your bill"), sent with the PDF attached. */
export function invoiceEmail(input: { customerName: string; invoiceNumber: string; total: number; publicLink?: string }): EmailContent {
  return renderEmail({
    preheader: `Invoice ${input.invoiceNumber} — total due ${formatTZS(input.total)}.`,
    heading: `Invoice ${input.invoiceNumber}`,
    intro: `Dear ${input.customerName}, please find invoice ${input.invoiceNumber} attached as a PDF. The total due is ${formatTZS(input.total)}.`,
    ...(input.publicLink ? { button: { label: "View invoice online", url: input.publicLink } } : {}),
    footerNote: "Thank you for your business.",
  });
}

/** Tax filing reminder. `rowsHtml` is a pre-built list/table of filings. */
export function taxReminderEmail(rowsHtml: string): EmailContent {
  return renderEmail({
    preheader: "You have tax filings due soon.",
    heading: "Tax filings due soon",
    intro: "The following tax filings are due within the next 5 days. Please prepare and file them on time to stay compliant.",
    bodyHtml: rowsHtml,
    footerNote: "You're receiving this because you're the account owner for a Uhasibu Digito company.",
  });
}
