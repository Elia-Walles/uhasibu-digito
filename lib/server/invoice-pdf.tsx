import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatTZS } from "@/lib/utils/currency";
import { currencyToWords } from "@/lib/utils/invoice-totals";
import type { InvoicePdfData } from "@/lib/server/invoice-pdf-data";

const TEAL = "#0F7B5E";
const OBSIDIAN = "#0A2318";
const MUTED = "#6B7280";
const BORDER = "#E5F0EC";
const PAGE_BG = "#F0FDF8";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 44, fontSize: 10, color: OBSIDIAN, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 8 },
  sellerName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: OBSIDIAN },
  tagline: { fontSize: 8, color: TEAL, marginTop: 2 },
  invoiceTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: TEAL, textAlign: "right" },
  invoiceNumber: { fontSize: 10, color: MUTED, textAlign: "right", marginTop: 2 },
  contactLine: { fontSize: 8.5, color: MUTED, marginTop: 10, lineHeight: 1.4 },
  rule: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 16 },
  twoCol: { flexDirection: "row", justifyContent: "space-between" },
  colLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  strong: { fontFamily: "Helvetica-Bold", color: OBSIDIAN },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  detailLabel: { color: MUTED },
  tableHead: { flexDirection: "row", backgroundColor: OBSIDIAN, color: "#FFFFFF", paddingVertical: 7, paddingHorizontal: 10, marginTop: 22, borderRadius: 4 },
  th: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  tableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  cDesc: { flex: 3 },
  cQty: { flex: 1, textAlign: "right" },
  cPrice: { flex: 1.5, textAlign: "right" },
  cVat: { flex: 1, textAlign: "right" },
  cAmount: { flex: 1.6, textAlign: "right" },
  totalsBox: { marginTop: 14, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 24, marginBottom: 4 },
  totalLabel: { color: MUTED },
  grandTotal: { flexDirection: "row", justifyContent: "flex-end", gap: 24, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: OBSIDIAN },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: TEAL },
  words: { marginTop: 12, fontSize: 9, color: MUTED, fontStyle: "italic" },
  efdBox: { marginTop: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: PAGE_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 14 },
  efdTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: OBSIDIAN, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  efdRow: { flexDirection: "row", marginBottom: 3 },
  efdLabel: { width: 130, color: MUTED },
  efdValue: { fontFamily: "Helvetica-Bold", color: OBSIDIAN },
  qr: { width: 96, height: 96 },
  qrCaption: { fontSize: 7, color: MUTED, textAlign: "center", marginTop: 3 },
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

function InvoiceDocument({ data, logo, qr }: { data: InvoicePdfData; logo: string | null; qr: string }) {
  const balanceDue = data.total - data.amountPaid;
  return (
    <Document title={`Invoice ${data.number}`} author={data.company.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {logo ? <Image src={logo} style={styles.logo} /> : null}
            <View>
              <Text style={styles.sellerName}>{data.company.name}</Text>
              <Text style={styles.tagline}>Akaunti yako, nguvu yako</Text>
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.number}</Text>
          </View>
        </View>

        <Text style={styles.contactLine}>
          {[data.company.address, data.company.phone, data.company.email].filter(Boolean).join(" · ")}
          {data.company.tin ? `\nTIN: ${data.company.tin}` : ""}{data.company.vatNumber ? `   VAT: ${data.company.vatNumber}` : ""}
        </Text>

        <View style={styles.rule} />

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.colLabel}>Bill To</Text>
            <Text style={styles.strong}>{data.customer.name}</Text>
            {data.customer.tin ? <Text style={{ color: MUTED }}>TIN: {data.customer.tin}</Text> : null}
            {data.customer.address ? <Text style={{ color: MUTED }}>{data.customer.address}</Text> : null}
            {data.customer.email ? <Text style={{ color: MUTED }}>{data.customer.email}</Text> : null}
          </View>
          <View style={{ flex: 1, paddingLeft: 24 }}>
            <Text style={styles.colLabel}>Invoice Details</Text>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Issue date</Text><Text>{data.issueDate}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Due date</Text><Text style={styles.strong}>{data.dueDate}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text>{data.status}</Text></View>
          </View>
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.cDesc]}>Description</Text>
          <Text style={[styles.th, styles.cQty]}>Qty</Text>
          <Text style={[styles.th, styles.cPrice]}>Unit price</Text>
          <Text style={[styles.th, styles.cVat]}>VAT %</Text>
          <Text style={[styles.th, styles.cAmount]}>Amount</Text>
        </View>
        {data.lines.map((l, i) => (
          <View style={styles.tableRow} key={i}>
            <Text style={styles.cDesc}>{l.description || "—"}</Text>
            <Text style={styles.cQty}>{l.quantity.toLocaleString()}</Text>
            <Text style={styles.cPrice}>{formatTZS(l.unitPrice)}</Text>
            <Text style={styles.cVat}>{l.vatPct}%</Text>
            <Text style={styles.cAmount}>{formatTZS(l.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text>{formatTZS(data.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>VAT (18%)</Text><Text>{formatTZS(data.vatAmount)}</Text></View>
          <View style={styles.grandTotal}><Text style={styles.grandLabel}>Total</Text><Text style={styles.grandValue}>{formatTZS(data.total)}</Text></View>
          {data.amountPaid > 0 ? (
            <>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Paid</Text><Text>{formatTZS(data.amountPaid)}</Text></View>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Balance due</Text><Text style={styles.strong}>{formatTZS(balanceDue)}</Text></View>
            </>
          ) : null}
        </View>

        <Text style={styles.words}>Amount in words: {currencyToWords(data.total)}.</Text>

        <View style={styles.efdBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.efdTitle}>Fiscal receipt</Text>
            <View style={styles.efdRow}><Text style={styles.efdLabel}>EFD receipt no.</Text><Text style={styles.efdValue}>{data.efdNumber || "—"}</Text></View>
            <View style={styles.efdRow}><Text style={styles.efdLabel}>EFD serial</Text><Text style={styles.efdValue}>{data.company.efdSerial || "—"}</Text></View>
            <View style={styles.efdRow}><Text style={styles.efdLabel}>Supplier TIN</Text><Text style={styles.efdValue}>{data.company.tin || "—"}</Text></View>
            <View style={styles.efdRow}><Text style={styles.efdLabel}>VAT reg.</Text><Text style={styles.efdValue}>{data.company.vatNumber || "—"}</Text></View>
          </View>
          <View>
            <Image src={qr} style={styles.qr} />
            <Text style={styles.qrCaption}>Scan to verify</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a computer-generated tax invoice. {data.company.name}
          {data.company.phone ? ` · ${data.company.phone}` : ""}
        </Text>
      </Page>
    </Document>
  );
}

/** Renders a customer invoice to a PDF Buffer, embedding an EFD/VFD-style verification QR code. */
export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const qrText = `TIN:${data.company.tin};VRN:${data.company.vatNumber};EFD:${data.efdNumber};INV:${data.number};DATE:${data.issueDate};TOTAL:${data.total}`;
  const qr = await QRCode.toDataURL(qrText, { margin: 1, width: 160 });
  return renderToBuffer(<InvoiceDocument data={data} logo={logoDataUri()} qr={qr} />);
}
