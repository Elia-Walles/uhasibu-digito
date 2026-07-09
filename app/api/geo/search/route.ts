import { NextResponse } from "next/server";

// Free-text place search for the map's search box, constrained to the selected country (ISO-2).
// Source: Nominatim (OpenStreetMap).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NominatimPlace {
  lat?: string;
  lon?: string;
  display_name?: string;
}

export interface GeoSearchResult {
  lat: number;
  lon: number;
  label: string;
}

export async function GET(req: Request): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const query = params.get("q")?.trim();
  const iso2 = params.get("iso2")?.trim().toLowerCase();
  if (!query) return NextResponse.json({ results: [] });

  const q = new URLSearchParams({ format: "jsonv2", q: query, limit: "6", addressdetails: "0" });
  if (iso2) q.set("countrycodes", iso2);

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${q.toString()}`, {
      headers: { "User-Agent": "UhasibuDigito/1.0 (onboarding; +https://uhasibudigito.co.tz)" },
    });
    if (!res.ok) return NextResponse.json({ error: "Search failed" }, { status: 502 });
    const places = (await res.json()) as NominatimPlace[];
    const results: GeoSearchResult[] = places
      .filter((p): p is NominatimPlace & { lat: string; lon: string } => Boolean(p.lat && p.lon))
      .map((p) => ({ lat: Number(p.lat), lon: Number(p.lon), label: p.display_name ?? "" }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
