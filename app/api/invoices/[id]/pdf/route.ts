import { auth } from "@/auth";
import { loadInvoiceForPdf } from "@/lib/server/invoice-pdf-data";
import { renderInvoicePdf } from "@/lib/server/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Streams the branded customer-invoice PDF. Access: the owning tenant, or any super-admin.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const loaded = await loadInvoiceForPdf({ id });
  if (!loaded) return new Response("Not found", { status: 404 });

  const isOwner = loaded.tenantId === session.user.tenantId;
  const isSuper = session.user.isSuperAdmin === true;
  if (!isOwner && !isSuper) return new Response("Forbidden", { status: 403 });

  const pdf = await renderInvoicePdf(loaded.data);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${loaded.data.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
