"use client";
import { useEffect, useState } from "react";

/**
 * Tracks browser connectivity via `navigator.onLine` + the online/offline events. Onboarding needs
 * an active connection (live country/district data + map), so the wizard uses this to gate step 1.
 * Starts optimistic (`true`) to avoid a false "offline" flash before hydration.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
