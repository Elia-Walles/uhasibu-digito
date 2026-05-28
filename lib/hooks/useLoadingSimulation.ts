"use client";
import { useState, useEffect } from "react";

export function useLoadingSimulation(delayMs = 900) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return loading;
}
