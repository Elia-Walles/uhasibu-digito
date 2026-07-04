"use client";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface HeroBackgroundProps {
  /** "light" = homepage hero (full-bleed), "obsidian" = the narrower auth brand panel. */
  variant?: "light" | "obsidian";
  className?: string;
  priority?: boolean;
}

/**
 * Photographic brand background: a self-hosted finance-dashboard photo under a
 * teal → obsidian gradient scrim so white foreground text stays readable while
 * the image texture shows through. Shared by the landing hero and the auth brand
 * panel so every entry surface looks the same. Purely decorative → aria-hidden.
 *
 * Photo: Unsplash license (free, no attribution required) — /images/hero-finance.jpg.
 */
export function HeroBackground({ variant = "light", className, priority = true }: HeroBackgroundProps) {
  const obsidian = variant === "obsidian";
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <Image
        src="/images/hero-finance.jpg"
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-[center_35%]"
      />

      {/* Teal → obsidian scrim for text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background: obsidian
            ? "linear-gradient(180deg, rgba(10,31,22,0.84) 0%, rgba(10,31,22,0.93) 100%)"
            : "linear-gradient(135deg, rgba(10,31,22,0.94) 0%, rgba(13,43,30,0.86) 45%, rgba(15,123,94,0.76) 100%)",
        }}
      />

      {/* Soft teal glow accent, top-right */}
      <div
        className="absolute -top-32 -right-24 w-[30rem] h-[30rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--color-ud-primary-glow) 0%, transparent 68%)",
          opacity: obsidian ? 0.16 : 0.22,
        }}
      />

      {/* Light variant: fade the bottom edge into the page background so the feature cards blend in */}
      {!obsidian && <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ud-surface-3" />}
    </div>
  );
}
