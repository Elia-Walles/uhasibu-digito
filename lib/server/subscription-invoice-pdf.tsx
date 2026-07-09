import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { PLATFORM_BANK, PLATFORM_SELLER } from "@/lib/config/billing";
import { formatTZS } from "@/lib/utils/currency";
import { currencyToWords } from "@/lib/utils/invoice-totals";
import type { SubscriptionInvoiceView } from "@/types/billing";

const TEAL = "#0F7B5E";
const OBSIDIAN = "#0A2318";
const MUTED = "#6B7280";
const BORDER = "#E5F0EC";
const PAGE_BG = "#F0FDF8";
const WARNING = "#D97706";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 44, fontSize: 10, color: OBSIDIAN, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 8 },
  sellerName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: OBSIDIAN },
  tagline: { fontSize: 8, color: TEAL, marginTop: 2 },
  invoiceTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: TEAL, textAlign: "right" },
  invoiceNumber: { fontSize: 10, color: MUTED, textAlign: "right", marginTop: 2 },
  statusBadge: { marginTop: 6, alignSelf: "flex-end", borderWidth: 1, borderColor: WARNING, color: WARNING, fontSize: 9, fontFamily: "Helvetica-Bold", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  contactLine: { fontSize: 8.5, color: MUTED, marginTop: 10, lineHeight: 1.4 },
  rule: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 16 },
  twoCol: { flexDirection: "row", justifyContent: "space-between" },
  colLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  strong: { fontFamily: "Helvetica-Bold", color: OBSIDIAN },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  detailLabel: { color: MUTED },
  tableHead: { flexDirection: "row", backgroundColor: OBSIDIAN, color: "#FFFFFF", paddingVertical: 7, paddingHorizontal: 10, marginTop: 22, borderRadius: 4 },
  th: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  tableRow: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  cDesc: { flex: 3 },
  cPeriod: { flex: 1.4, textAlign: "center" },
  cAmount: { flex: 1.6, textAlign: "right" },
  totalsBox: { marginTop: 14, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 24, marginBottom: 4 },
  totalLabel: { color: MUTED },
  grandTotal: { flexDirection: "row", justifyContent: "flex-end", gap: 24, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: OBSIDIAN },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: TEAL },
  words: { marginTop: 12, fontSize: 9, color: MUTED, fontStyle: "italic" },
  bankBox: { marginTop: 22, backgroundColor: PAGE_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 14 },
  bankTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: OBSIDIAN, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  bankRow: { flexDirection: "row", marginBottom: 3 },
  bankLabel: { width: 120, color: MUTED },
  bankValue: { fontFamily: "Helvetica-Bold", color: OBSIDIAN },
  footer: { position: "absolute", bottom: 26, left: 44, right: 44, textAlign: "center", fontSize: 8, color: MUTED, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 },
});

function logoDataUri(): string | null {
  try {
    const buf = readFileSync(join(process.cwd(), "public", "images", "uhasibu-digito-circle.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Dar_es_Salaam",
  }).format(new Date(iso));
}

function InvoiceDocument({ invoice, logo }: { invoice: SubscriptionInvoiceView; logo: string | null }) {
  const amount = formatTZS(invoice.amountTzs);
  return (
    <Document title={`Invoice ${invoice.number}`} author={PLATFORM_SELLER.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {logo ? <Image src={logo} style={styles.logo} /> : null}
            <View>
              <Text style={styles.sellerName}>{PLATFORM_SELLER.name}</Text>
              <Text style={styles.tagline}>{PLATFORM_SELLER.tagline}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.number}</Text>
            <Text style={styles.statusBadge}>{invoice.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.contactLine}>
          {PLATFORM_SELLER.address} · {PLATFORM_SELLER.phone} · {PLATFORM_SELLER.email} · {PLATFORM_SELLER.website}
        </Text>

        <View style={styles.rule} />

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.colLabel}>Bill To</Text>
            <Text style={styles.strong}>{invoice.billToCompany}</Text>
            {invoice.billToName ? <Text>{invoice.billToName}</Text> : null}
            {invoice.billToEmail ? <Text style={{ color: MUTED }}>{invoice.billToEmail}</Text> : null}
          </View>
          <View style={{ flex: 1, paddingLeft: 24 }}>
            <Text style={styles.colLabel}>Invoice Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Issue date</Text>
              <Text>{fmtDate(invoice.issuedAt)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due date</Text>
              <Text style={styles.strong}>{fmtDate(invoice.dueAt)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Currency</Text>
              <Text>{invoice.currency}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.cDesc]}>Description</Text>
          <Text style={[styles.th, styles.cPeriod]}>Period</Text>
          <Text style={[styles.th, styles.cAmount]}>Amount</Text>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.cDesc}>
            <Text style={styles.strong}>{invoice.planName} plan</Text>
            <Text style={{ color: MUTED, fontSize: 9, marginTop: 2 }}>Uhasibu Digito subscription</Text>
          </View>
          <Text style={styles.cPeriod}>1 {invoice.billingInterval}</Text>
          <Text style={styles.cAmount}>{amount}</Text>
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{amount}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT</Text>
            <Text>—</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandLabel}>Total due</Text>
            <Text style={styles.grandValue}>{amount}</Text>
          </View>
        </View>

        <Text style={styles.words}>Amount in words: {currencyToWords(invoice.amountTzs)}.</Text>

        <View style={styles.bankBox}>
          <Text style={styles.bankTitle}>Pay by bank transfer</Text>
          {[
            ["Bank", PLATFORM_BANK.bankName],
            ["Account name", PLATFORM_BANK.accountName],
            ["Account number", PLATFORM_BANK.accountNumber],
            ["Account type", PLATFORM_BANK.accountType],
            ["Bank type", PLATFORM_BANK.bankType],
            ["Payment reference", invoice.number],
          ].map(([label, value]) => (
            <View style={styles.bankRow} key={label}>
              <Text style={styles.bankLabel}>{label}</Text>
              <Text style={styles.bankValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Thank you for choosing {PLATFORM_SELLER.name}. Your account is activated once payment is
          confirmed. Questions? {PLATFORM_SELLER.email} · {PLATFORM_SELLER.phone}
        </Text>
      </Page>
    </Document>
  );
}

/** Renders the subscription invoice to a PDF Buffer (used for the email attachment and download). */
export async function renderSubscriptionInvoicePdf(invoice: SubscriptionInvoiceView): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} logo={logoDataUri()} />);
}
