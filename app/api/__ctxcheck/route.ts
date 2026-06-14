import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";

// TEMPORARY diagnostic route verifies withAuth + scoped db works in the Next server runtime.
export async function GET() {
  try {
    const count = await withAuth(async () => db.customer.count());
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
