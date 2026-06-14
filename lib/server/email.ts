import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Gmail SMTP email via nodemailer. The transporter is built lazily from EMAIL_SERVER_*
// and memoised. When SMTP isn't configured (local dev / preview without creds) sendMail
// no-ops and logs instead of throwing, so flows that send mail still complete.

interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let cached: Transporter | null = null;

export function emailConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_SERVER_HOST &&
      process.env.EMAIL_SERVER_USER &&
      process.env.EMAIL_SERVER_PASSWORD,
  );
}

function transporter(): Transporter | null {
  if (!emailConfigured()) return null;
  if (!cached) {
    const port = Number(process.env.EMAIL_SERVER_PORT ?? 587);
    cached = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port,
      secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
  }
  return cached;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? process.env.EMAIL_SERVER_USER ?? "no-reply@uhasibudigito.co.tz";
}

/**
 * Send an email. Returns true if dispatched, false if SMTP is unconfigured (logged) or the
 * send failed (callers treat a false as "not delivered" and proceed never throws).
 */
export async function sendMail({ to, subject, html, text }: MailInput): Promise<boolean> {
  const tx = transporter();
  if (!tx) {
    console.warn(`[email] SMTP not configured skipped send to ${to}: "${subject}"`);
    return false;
  }
  try {
    await tx.sendMail({ from: fromAddress(), to, subject, html, ...(text ? { text } : {}) });
    return true;
  } catch (err) {
    console.error(`[email] send failed to ${to}:`, err);
    return false;
  }
}
