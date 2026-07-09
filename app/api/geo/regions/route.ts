import { NextResponse } from "next/server";

// Proxies a country's administrative subdivisions (states/regions) from countriesnow.space.
// Query: ?country=<English country name>. Cached per country for a day.
export const runtime = "nodejs";
export const revalidate = 86400;

interface StatesResponse {
  error?: boolean;
  data?: { states?: { name?: string }[] };
}

export async function GET(req: Request): Promise<NextResponse> {
  const country = new URL(req.url).searchParams.get("country")?.trim();
  if (!country) return NextResponse.json({ error: "Missing country" }, { status: 400 });
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "UhasibuDigito/1.0 (onboarding)" },
      body: JSON.stringify({ country }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ error: "Region lookup failed" }, { status: 502 });
    const json = (await res.json()) as StatesResponse;
    const regions = (json.data?.states ?? [])
      .map((s) => s.name?.trim())
      .filter((n): n is string => Boolean(n))
      .sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ regions });
  } catch {
    return NextResponse.json({ error: "Region lookup failed" }, { status: 502 });
  }
}
