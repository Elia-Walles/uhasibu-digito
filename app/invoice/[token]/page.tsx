import { notFound } from "next/navigation";
import { loadInvoiceForPdf } from "@/lib/server/invoice-pdf-data";
import { formatTZS } from "@/lib/utils/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, unauthenticated invoice view reached via the share link. No app shell.
export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const loaded = await loadInvoiceForPdf({ publicToken: token });
  if (!loaded) notFound();
  const inv = loaded.data;
  const balanceDue = inv.total - inv.amountPaid;

  return (
    <main className="min-h-screen bg-ud-surface-3 flex items-start justify-center p-4 sm:p-10">
      <div className="w-full max-w-2xl bg-white border border-ud-border rounded-2xl shadow-card p-6 sm:p-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display font-extrabold text-xl text-ud-text-primary">{inv.company.name}</div>
            <div className="text-xs text-ud-text-muted mt-0.5">{[inv.company.address, inv.company.phone].filter(Boolean).join(" · ")}</div>
            {inv.company.tin ? <div className="text-xs text-ud-text-muted">TIN: {inv.company.tin}{inv.company.vatNumber ? ` · VAT: ${inv.company.vatNumber}` : ""}</div> : null}
          </div>
          <div className="text-right">
            <div className="font-display font-bold text-2xl text-ud-primary">TAX INVOICE</div>
            <div className="text-sm text-ud-text-muted font-mono">{inv.number}</div>
          </div>
        </div>

        <div className="my-6 h-px bg-ud-border" />

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-ud-text-muted mb-1">Bill to</div>
            <div className="font-semibold text-ud-text-primary">{inv.customer.name}</div>
            {inv.customer.tin ? <div className="text-ud-text-muted">TIN: {inv.customer.tin}</div> : null}
            {inv.customer.address ? <div className="text-ud-text-muted">{inv.customer.address}</div> : null}
          </div>
          <div className="text-right">
            <div className="text-ud-text-muted">Issue date: <span className="text-ud-text-primary">{inv.issueDate}</span></div>
            <div className="text-ud-text-muted">Due date: <span className="text-ud-text-primary font-medium">{inv.dueDate}</span></div>
            <div className="text-ud-text-muted">EFD: <span className="font-mono text-ud-text-primary">{inv.efdNumber || "—"}</span></div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ud-obsidian text-white">
              <tr>
                <th className="text-left px-3 py-2 rounded-l-lg" scope="col">Description</th>
                <th className="text-right px-3 py-2" scope="col">Qty</th>
                <th className="text-right px-3 py-2" scope="col">Unit price</th>
                <th className="text-right px-3 py-2 rounded-r-lg" scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i} className="border-b border-ud-border">
                  <td className="px-3 py-2">{l.description || "—"}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{l.quantity.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatTZS(l.unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatTZS(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8"><span className="text-ud-text-muted">Subtotal</span><span className="font-mono tabular-nums">{formatTZS(inv.subtotal)}</span></div>
          <div className="flex gap-8"><span className="text-ud-text-muted">VAT (18%)</span><span className="font-mono tabular-nums">{formatTZS(inv.vatAmount)}</span></div>
          <div className="flex gap-8 pt-2 border-t border-ud-border font-bold"><span>Total</span><span className="font-mono tabular-nums text-ud-primary">{formatTZS(inv.total)}</span></div>
          {inv.amountPaid > 0 ? <div className="flex gap-8"><span className="text-ud-text-muted">Balance due</span><span className="font-mono tabular-nums">{formatTZS(balanceDue)}</span></div> : null}
        </div>

        <div className="mt-8 flex justify-center">
          <a
            href={`/api/invoices/public/${token}/pdf`}
            className="inline-flex items-center gap-2 rounded-xl bg-ud-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-ud-primary-hover transition-colors"
          >
            Download PDF
          </a>
        </div>
      </div>
    </main>
  );
}
