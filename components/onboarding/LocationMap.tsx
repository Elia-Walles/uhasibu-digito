"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import { Crosshair, Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useT } from "@/lib/hooks/useT";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  geocodeArea,
  reverseGeocode,
  searchPlaces,
  type GeoBounds,
  type GeoSearchResult,
} from "@/lib/geo/geo-api";

export interface LocationValue {
  lat?: number;
  lng?: number;
  street?: string;
}

interface LocationMapProps {
  countryCode?: string;
  country?: string;
  region?: string;
  district?: string;
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}

// On-brand teardrop pin as a div icon — avoids the well-known broken Leaflet marker-image paths.
const PIN = L.divIcon({
  className: "",
  html: `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="#0F7B5E"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/></svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/**
 * Frames the map to the selected area (region → district) whenever the bounds change, as long as the
 * user hasn't dropped a pin yet. Re-fits on every bounds change (so picking a district zooms into it);
 * once a pin exists we leave the map where the user placed it.
 */
function MapController({ bounds, hasPoint }: { bounds: GeoBounds | null; hasPoint: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!hasPoint && bounds) {
      map.fitBounds(
        [
          [bounds.south, bounds.west],
          [bounds.north, bounds.east],
        ],
        { padding: [24, 24], maxZoom: 15 },
      );
    }
  }, [bounds, hasPoint, map]);
  return null;
}

export default function LocationMap({ countryCode, country, region, district, value, onChange }: LocationMapProps) {
  const t = useT();
  const [map, setMap] = useState<L.Map | null>(null);
  const [bounds, setBounds] = useState<GeoBounds | null>(null);
  const [center, setCenter] = useState<[number, number]>([-6.163, 35.7516]); // Tanzania fallback
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null); // metres radius of the GPS fix

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const point: [number, number] | null =
    value.lat != null && value.lng != null ? [value.lat, value.lng] : null;

  // Frame the map to the selected area: a chosen district frames tightest, else the region.
  useEffect(() => {
    if (!country) return;
    const controller = new AbortController();
    geocodeArea(country, region, district, controller.signal)
      .then((res) => {
        if (!res) return;
        setCenter([res.lat, res.lon]);
        setBounds(res.bounds ?? null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [country, region, district]);

  // Debounced place search.
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    searchPlaces(q, countryCode, controller.signal)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
    return () => controller.abort();
  }, [debouncedQuery, countryCode]);

  async function setPoint(lat: number, lng: number) {
    onChange({ lat, lng, ...(value.street ? { street: value.street } : {}) });
    try {
      const street = await reverseGeocode(lat, lng);
      if (street) onChange({ lat, lng, street });
    } catch {
      /* keep the coordinates even if reverse-geocode fails */
    }
  }

  // A tighter GPS fix deserves a closer zoom.
  function zoomForAccuracy(acc: number): number {
    if (acc <= 30) return 18;
    if (acc <= 100) return 17;
    if (acc <= 300) return 16;
    if (acc <= 1000) return 14;
    return 12;
  }

  /**
   * Precise "my location": forces a fresh, high-accuracy fix (no cached position) and keeps the most
   * accurate reading over a short window — a single getCurrentPosition often returns an early, coarse
   * WiFi/IP estimate, whereas watching lets the GPS settle. Stops early once the fix is within 25 m.
   */
  function useMyLocation() {
    const geo = typeof navigator !== "undefined" ? navigator.geolocation : null;
    if (!geo) return;
    setLocating(true);

    let best: GeolocationPosition | null = null;
    let done = false;
    let watchId = 0;
    let timer: ReturnType<typeof setTimeout>;

    const finish = () => {
      if (done) return;
      done = true;
      geo.clearWatch(watchId);
      clearTimeout(timer);
      setLocating(false);
      if (best) {
        const { latitude, longitude, accuracy: acc } = best.coords;
        setAccuracy(acc);
        map?.setView([latitude, longitude], zoomForAccuracy(acc));
        void setPoint(latitude, longitude);
      }
    };

    watchId = geo.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (pos.coords.accuracy <= 25) finish(); // good enough — stop refining
      },
      () => finish(),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    timer = setTimeout(finish, 9000); // give the GPS up to 9s to settle, then take the best so far
  }

  function pickResult(r: GeoSearchResult) {
    setAccuracy(null);
    map?.setView([r.lat, r.lon], 16);
    void setPoint(r.lat, r.lon);
    setResults([]);
    setQuery(r.label.split(",")[0] ?? "");
  }

  return (
    <div className="relative">
      {/* Search + geolocate overlay */}
      <div className="absolute inset-x-2 top-2 z-[500] flex gap-2">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search a place…")}
            prefixIcon={searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            suffixIcon={
              query ? (
                <button type="button" aria-label={t("Clear")} onClick={() => { setQuery(""); setResults([]); }}>
                  <X className="w-4 h-4 text-ud-text-muted" />
                </button>
              ) : undefined
            }
            className="shadow-card"
          />
          {results.length > 0 && (
            <div className="absolute mt-1 w-full rounded-xl bg-white shadow-elevated border border-ud-border overflow-hidden max-h-52 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={`${r.lat}-${r.lon}-${i}`}
                  type="button"
                  onClick={() => pickResult(r)}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-ud-surface-2 truncate"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white border border-ud-border px-3 text-xs font-medium text-ud-text-secondary hover:border-ud-primary hover:text-ud-primary shadow-card transition-colors disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          {t("My location")}
        </button>
      </div>

      <MapContainer
        ref={setMap}
        center={center}
        zoom={6}
        scrollWheelZoom
        className="h-64 w-full rounded-2xl z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController bounds={bounds} hasPoint={point !== null} />
        <ClickHandler onPick={(lat, lng) => { setAccuracy(null); void setPoint(lat, lng); }} />
        {point && accuracy != null && accuracy > 25 && (
          <Circle
            center={point}
            radius={accuracy}
            pathOptions={{ color: "#0F7B5E", weight: 1, fillColor: "#0F7B5E", fillOpacity: 0.08 }}
          />
        )}
        {point && (
          <Marker
            position={point}
            icon={PIN}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                setAccuracy(null);
                void setPoint(lat, lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
