import "server-only";

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
