// Typed client fetchers for the geo route handlers under /api/geo. All calls accept an optional
// AbortSignal so callers (debounced search, cascading dropdowns) can cancel stale requests.

export interface GeoCountry {
  name: string;
  iso2: string;
  dialCode: string;
}

export interface GeoBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  bounds?: GeoBounds;
}

export interface GeoSearchResult {
  lat: number;
  lon: number;
  label: string;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, signal ? { signal } : {});
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchCountries(signal?: AbortSignal): Promise<GeoCountry[]> {
  const { countries } = await getJson<{ countries: GeoCountry[] }>("/api/geo/countries", signal);
  return countries;
}

/** A country's administrative subdivisions (states/regions). */
export async function fetchRegions(country: string, signal?: AbortSignal): Promise<string[]> {
  const { regions } = await getJson<{ regions: string[] }>(
    `/api/geo/regions?country=${encodeURIComponent(country)}`,
    signal,
  );
  return regions;
}

/** The cities/districts within a country's region (non-Tanzania fallback for the district level). */
export async function fetchCities(country: string, region: string, signal?: AbortSignal): Promise<string[]> {
  const { cities } = await getJson<{ cities: string[] }>(
    `/api/geo/cities?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}`,
    signal,
  );
  return cities;
}

export async function geocodeArea(
  country: string,
  region: string | undefined,
  district?: string,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({ country });
  if (region) params.set("region", region);
  if (district) params.set("district", district);
  const { result } = await getJson<{ result: GeocodeResult | null }>(
    `/api/geo/geocode?${params.toString()}`,
    signal,
  );
  return result;
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<string> {
  const { street } = await getJson<{ street: string }>(
    `/api/geo/reverse?lat=${lat}&lon=${lon}`,
    signal,
  );
  return street;
}

export async function searchPlaces(
  query: string,
  iso2: string | undefined,
  signal?: AbortSignal,
): Promise<GeoSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (iso2) params.set("iso2", iso2);
  const { results } = await getJson<{ results: GeoSearchResult[] }>(
    `/api/geo/search?${params.toString()}`,
    signal,
  );
  return results;
}
