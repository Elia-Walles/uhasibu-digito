import { NextResponse } from "next/server";

// Proxies the country list (name + ISO-2 + dial code) so the browser avoids CORS and we can cache
// it aggressively. Source: countriesnow.space — the same provider as the district lookup, so country
// names match between the two calls. Flags are rendered client-side from the ISO-2 code.
export const runtime = "nodejs";
export const revalidate = 86400; // 24h — the country list is effectively static

interface CountryCode {
  name?: string;
  code?: string; // ISO-2
  dial_code?: string;
}

interface CodesResponse {
  error?: boolean;
  data?: CountryCode[];
}

export interface GeoCountry {
  name: string;
  iso2: string;
  dialCode: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/codes", {
      headers: { "User-Agent": "UhasibuDigito/1.0 (onboarding)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ error: "Country lookup failed" }, { status: 502 });
    const json = (await res.json()) as CodesResponse;
    const countries: GeoCountry[] = (json.data ?? [])
      .filter((c): c is CountryCode & { name: string; code: string } => Boolean(c.name && c.code))
      .map((c) => ({ name: c.name, iso2: c.code.toUpperCase(), dialCode: c.dial_code ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ countries });
  } catch {
    return NextResponse.json({ error: "Country lookup failed" }, { status: 502 });
  }
}
