import { NextResponse } from "next/server";

// Proxies the cities within a country's region/state from countriesnow.space — the district-level
// fallback for non-Tanzania countries (Tanzania uses the bundled TAMISEMI councils instead).
// Query: ?country=<name>&region=<state name>. The POST form 301-redirects, so use the GET /q endpoint.
export const runtime = "nodejs";
export const revalidate = 86400;

interface CitiesResponse {
  error?: boolean;
  data?: string[];
}

export async function GET(req: Request): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const country = params.get("country")?.trim();
  const region = params.get("region")?.trim();
  if (!country || !region) return NextResponse.json({ error: "Missing country/region" }, { status: 400 });

  const q = new URLSearchParams({ country, state: region });
  try {
    const res = await fetch(`https://countriesnow.space/api/v0.1/countries/state/cities/q?${q.toString()}`, {
      headers: { "User-Agent": "UhasibuDigito/1.0 (onboarding)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ cities: [] });
    const json = (await res.json()) as CitiesResponse;
    if (json.error) return NextResponse.json({ cities: [] });
    const cities = (json.data ?? [])
      .map((c) => c?.trim())
      .filter((n): n is string => Boolean(n))
      .sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ cities });
  } catch {
    return NextResponse.json({ cities: [] });
  }
}
