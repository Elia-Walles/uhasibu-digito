"use client";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useT } from "@/lib/hooks/useT";
import type { LocationValue } from "./LocationMap";

// Leaflet touches `window` on import, so the map only loads on the client (never SSR'd).
const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-2xl skeleton" aria-hidden />
  ),
});

interface LocationPickerProps {
  countryCode?: string;
  country?: string;
  region?: string;
  district?: string;
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  label?: string;
}

/**
 * Street/location picker: an interactive Leaflet map (search, "my location", draggable marker,
 * framed to the chosen country+district) plus a Street text field that the map reverse-geocode fills
 * and the user can still edit by hand. Disabled until a country is chosen.
 */
export function LocationPicker({ countryCode, country, region, district, value, onChange, label }: LocationPickerProps) {
  const t = useT();
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium tracking-[0.04em] text-ud-text-secondary mb-1.5">
          {t(label)}
        </label>
      )}
      {country ? (
        <div className="space-y-2">
          <LocationMap
            {...(countryCode ? { countryCode } : {})}
            country={country}
            {...(region ? { region } : {})}
            {...(district ? { district } : {})}
            value={value}
            onChange={onChange}
          />
          <Input
            value={value.street ?? ""}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            placeholder={t("Street name")}
            prefixIcon={<MapPin className="w-4 h-4" />}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ud-border bg-ud-surface-2 p-6 text-center text-sm text-ud-text-muted">
          {t("Select your country first to place your location on the map.")}
        </div>
      )}
    </div>
  );
}
