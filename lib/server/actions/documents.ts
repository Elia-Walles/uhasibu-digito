"use server";
import { del } from "@vercel/blob";
import type { Document as DbDocument } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { ok, err, type Result } from "@/lib/server/result";

export interface UploadedDocument {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

function rowToDoc(d: DbDocument): UploadedDocument {
  return {
    id: d.id,
    fileName: d.fileName,
    url: d.url,
    mimeType: d.mimeType,
    size: d.size,
    createdAt: d.createdAt.toISOString(),
  };
}

export async function listDocuments(ownerType: string, ownerId: string): Promise<UploadedDocument[]> {
  return withAuth(async () => {
    const rows = await db.document.findMany({
      where: { ownerType, ownerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(rowToDoc);
  });
}

export async function deleteDocument(id: string): Promise<Result<{ id: string }>> {
  return withAuth(async () => {
    const doc = await db.document.findFirst({ where: { id } });
    if (!doc) return err("Document not found");
    try {
      await del(doc.url);
    } catch {
      // Blob already gone / storage unconfigured — still remove the DB row.
    }
    await db.document.deleteMany({ where: { id } });
    return ok({ id });
  });
}
