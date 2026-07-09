import { loadInvoiceForPdf } from "@/lib/server/invoice-pdf-data";
import { renderInvoicePdf } from "@/lib/server/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, unauthenticated invoice PDF — access is by the unguessable token only.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }): Promise<Response> {
  const { token } = await params;
  const loaded = await loadInvoiceForPdf({ publicToken: token });
  if (!loaded) return new Response("Not found", { status: 404 });

  const pdf = await renderInvoicePdf(loaded.data);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${loaded.data.number}.pdf"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
