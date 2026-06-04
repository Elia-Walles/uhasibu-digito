"use client";

/**
 * Deprecated no-op. The app no longer simulates loading — pages reflect the real loading
 * state of their data hooks. Retained as a stable shim so existing call sites compile; new
 * code should not use it.
 */
export function useLoadingSimulation(_delayMs = 0): boolean {
  void _delayMs;
  return false;
}
