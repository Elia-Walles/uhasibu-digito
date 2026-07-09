"use client";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Renders a country's national flag as an SVG image (from flagcdn) given its ISO-2 code. Uses a plain
 * <img> to a lightweight CDN rather than bundling ~260 flag components — onboarding requires an
 * internet connection anyway. Falls back to a neutral chip when the code is unknown or the image
 * fails, so the layout never jumps.
 */
export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const iso = code?.toUpperCase();
  const [failed, setFailed] = useState(false);
  if (!iso || iso.length !== 2 || failed) {
    return <span className={cn("inline-block rounded-[2px] bg-ud-border", className ?? "w-5 h-3.5")} aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${iso.toLowerCase()}.svg`}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("rounded-[2px] object-cover", className ?? "w-5 h-3.5")}
    />
  );
}
