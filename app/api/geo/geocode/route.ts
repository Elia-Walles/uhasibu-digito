import { NextResponse } from "next/server";

// Resolves a country (+ optional region, + optional district) to a lat/lng centre and a bounding
// box, so the map can frame and zoom to that area. With a district it frames to the district (a
// tighter area); otherwise to the region. Source: Nominatim (OpenStreetMap).
export const runtime = "nodejs";
export const revalidate = 86400;

interface NominatimPlace {
  lat?: string;
  lon?: string;
  boundingbox?: [string, string, string, string]; // [south, north, west, east]
}

const UA = "UhasibuDigito/1.0 (onboarding; +https://uhasibudigito.co.tz)";

export async function GET(req: Request): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const country = params.get("country")?.trim();
  const region = params.get("region")?.trim();
  const district = params.get("district")?.trim();
  if (!country) return NextResponse.json({ error: "Missing country" }, { status: 400 });

  // Build the query: a district frames tightest (free-text, since council names like "Kinondoni MC"
  // don't match Nominatim's structured fields — strip the LGA suffix first). Otherwise frame by the
  // region via structured country+state.
  let q: URLSearchParams;
  if (district) {
    const clean = district.replace(/\s+(MC|DC|TC|CC)$/i, "").trim();
    const text = [clean, region, country].filter(Boolean).join(", ");
    q = new URLSearchParams({ format: "jsonv2", q: text, limit: "1", addressdetails: "0" });
  } else {
    q = new URLSearchParams({ format: "jsonv2", country, limit: "1" });
    if (region) q.set("state", region);
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${q.toString()}`, {
      headers: { "User-Agent": UA },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
    const places = (await res.json()) as NominatimPlace[];
    const place = places[0];
    if (!place?.lat || !place.lon) return NextResponse.json({ result: null });
    const bb = place.boundingbox;
    return NextResponse.json({
      result: {
        lat: Number(place.lat),
        lon: Number(place.lon),
        ...(bb ? { bounds: { south: Number(bb[0]), north: Number(bb[1]), west: Number(bb[2]), east: Number(bb[3]) } } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
  }
}
