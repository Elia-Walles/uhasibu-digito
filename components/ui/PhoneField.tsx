"use client";
import { useEffect, useMemo, useState } from "react";
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import { Phone } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import { CountryFlag } from "@/components/ui/CountryFlag";
import type { GeoCountry } from "@/lib/geo/geo-api";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

interface PhoneValue {
  phone: string; // E.164, or "" when empty/invalid
  phoneCountryCode: string; // dial code, e.g. "+255"
  countryCode: string; // ISO-2 of the selected dial code
}

interface PhoneFieldProps {
  value: string; // E.164
  countryCode?: string; // ISO-2 (selected dial code country)
  countries: GeoCountry[];
  onChange: (v: PhoneValue) => void;
  label?: string;
  defaultCountry?: string; // ISO-2, fallback when nothing is set yet
  className?: string;
}

/**
 * International phone input: a searchable dial-code picker (flag + code) beside a national-number
 * field that formats as-you-type via libphonenumber-js and emits an E.164 number. Country/dial data
 * is supplied by the parent (already fetched once for the country selector).
 */
export function PhoneField({
  value,
  countryCode,
  countries,
  onChange,
  label,
  defaultCountry = "TZ",
  className,
}: PhoneFieldProps) {
  const t = useT();

  const initialIso = useMemo(() => {
    if (value) {
      const parsed = parsePhoneNumberFromString(value);
      if (parsed?.country) return parsed.country;
    }
    return (countryCode || defaultCountry).toUpperCase();
  }, [value, countryCode, defaultCountry]);

  const [iso, setIso] = useState(initialIso);
  const [national, setNational] = useState(() => {
    if (!value) return "";
    const parsed = parsePhoneNumberFromString(value);
    return parsed ? parsed.formatNational() : value;
  });

  // Re-sync when the parent hydrates a draft after mount.
  useEffect(() => {
    if (value) {
      const parsed = parsePhoneNumberFromString(value);
      if (parsed) {
        setIso(parsed.country ?? iso);
        setNational(parsed.formatNational());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const options: SearchableOption[] = useMemo(
    () =>
      countries
        .filter((c) => c.dialCode)
        .map((c) => ({
          value: c.iso2,
          label: `${c.name} ${c.dialCode}`,
          triggerLabel: c.dialCode,
          leading: <CountryFlag code={c.iso2} className="w-5 h-3.5 shrink-0" />,
        })),
    [countries],
  );

  const dialFor = (isoCode: string) => countries.find((c) => c.iso2 === isoCode)?.dialCode ?? "";

  function emit(nextIso: string, nextNational: string) {
    const dial = dialFor(nextIso);
    const parsed = parsePhoneNumberFromString(nextNational, nextIso as CountryCode);
    onChange({
      phone: parsed?.isValid() ? parsed.number : "",
      phoneCountryCode: dial,
      countryCode: nextIso,
    });
  }

  function onIsoChange(nextIso: string) {
    setIso(nextIso);
    emit(nextIso, national);
  }

  function onNationalChange(raw: string) {
    const formatted = new AsYouType(iso as CountryCode).input(raw);
    setNational(formatted);
    emit(iso, formatted);
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-xs font-medium tracking-[0.04em] text-ud-text-secondary mb-1.5">
          {t(label)}
        </label>
      )}
      <div className="flex items-stretch gap-2">
        <div className="w-[8.5rem] shrink-0">
          <SearchableSelect
            value={iso}
            onValueChange={onIsoChange}
            options={options}
            placeholder={t("Code")}
            searchPlaceholder={t("Search country")}
          />
        </div>
        <Input
          type="tel"
          inputMode="tel"
          value={national}
          onChange={(e) => onNationalChange(e.target.value)}
          placeholder="712 345 678"
          prefixIcon={<Phone className="w-4 h-4" />}
          autoComplete="tel-national"
          containerClassName="flex-1"
        />
      </div>
    </div>
  );
}
