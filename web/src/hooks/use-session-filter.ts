"use client";

import { useState } from "react";

function readStoredFilter<T extends string>(
  storageKey: string,
  defaultValue: T,
  allowed: readonly T[],
): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored && (allowed as readonly string[]).includes(stored)) {
      return stored as T;
    }
  } catch {
    // sessionStorage unavailable
  }
  return defaultValue;
}

/**
 * Persists a filter value in sessionStorage so it survives navigating away
 * and back within the same browser tab (e.g. admin sidebar pages).
 */
export function useSessionFilter<T extends string>(
  storageKey: string,
  defaultValue: T,
  allowed: readonly T[],
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() =>
    readStoredFilter(storageKey, defaultValue, allowed),
  );

  function update(next: T) {
    setValue(next);
    try {
      sessionStorage.setItem(storageKey, next);
    } catch {
      // ignore quota / privacy mode
    }
  }

  return [value, update];
}
