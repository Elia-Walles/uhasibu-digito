import { NextResponse } from "next/server";

// Reverse-geocodes a dropped/dragged marker to a street-level label, used to fill the Street field.
// Source: Nominatim (OpenStreetMap).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NominatimReverse {
  address?: { road?: string; pedestrian?: string; neighbourhood?: string; suburb?: string; hamlet?: string; village?: string };
  display_name?: string;
}

export async function GET(req: Request): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const lat = params.get("lat");
  const lon = params.get("lon");
  if (!lat || !lon) return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });

  const q = new URLSearchParams({ format: "jsonv2", lat, lon, zoom: "18", addressdetails: "1" });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${q.toString()}`, {
      headers: { "User-Agent": "UhasibuDigito/1.0 (onboarding; +https://uhasibudigito.co.tz)" },
    });
    if (!res.ok) return NextResponse.json({ error: "Reverse geocode failed" }, { status: 502 });
    const json = (await res.json()) as NominatimReverse;
    const a = json.address ?? {};
    const street = a.road ?? a.pedestrian ?? a.neighbourhood ?? a.suburb ?? a.hamlet ?? a.village ?? "";
    return NextResponse.json({ street, displayName: json.display_name ?? "" });
  } catch {
    return NextResponse.json({ error: "Reverse geocode failed" }, { status: 502 });
  }
}
