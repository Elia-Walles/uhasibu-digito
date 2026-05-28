"use client";
import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (callback: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    const media = window.matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  };
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false
  );
}

export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
export const useIsTablet = () => useMediaQuery("(max-width: 1023px)");
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
