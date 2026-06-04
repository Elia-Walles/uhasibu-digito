import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/lib/server/db";
import { runWithContext } from "@/lib/server/request-context";

// Vercel Blob upload endpoint. Session-authenticated; stores under `${tenantId}/${purpose}/…`.
// `purpose`: "logo" → CompanyProfile.logoUrl, "avatar" → User.image, else a Document row
// keyed by (ownerType, ownerId). Returns the public blob URL (+ the Document when applicable).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ctx = { tenantId: user.tenantId, userId: user.id, role: user.role };

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "File storage is not configured." }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });
  }

  const purpose = String(form.get("purpose") ?? "document");
  const ownerType = String(form.get("ownerType") ?? "");
  const ownerId = String(form.get("ownerId") ?? "");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${ctx.tenantId}/${purpose}/${safeName}`;
  const blob = await put(key, file, { access: "public", addRandomSuffix: true });

  const payload = await runWithContext(ctx, async () => {
    if (purpose === "logo") {
      await db.companyProfile.updateMany({ data: { logoUrl: blob.url } });
      return { url: blob.url };
    }
    if (purpose === "avatar") {
      await db.user.update({ where: { id: ctx.userId }, data: { image: blob.url } });
      return { url: blob.url };
    }
    if (!ownerType || !ownerId) {
      return { url: blob.url };
    }
    const doc = await db.document.create({
      data: {
        tenantId: ctx.tenantId,
        ownerType,
        ownerId,
        url: blob.url,
        pathname: blob.pathname,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        uploadedById: ctx.userId,
      },
    });
    return {
      url: blob.url,
      document: {
        id: doc.id,
        fileName: doc.fileName,
        url: doc.url,
        mimeType: doc.mimeType,
        size: doc.size,
        createdAt: doc.createdAt.toISOString(),
      },
    };
  });

  return NextResponse.json(payload);
}
