"use client";

import { useEffect, useState } from "react";
import type { ContrastMode } from "@/lib/exam/contrast";
import { contrastStorageKey, legacyContrastStorageKey } from "@/lib/exam/contrast";

const MODES: ContrastMode[] = [
  "black-on-white",
  "white-on-black",
  "yellow-on-black",
];

function parseContrast(raw: string | null): ContrastMode | null {
  if (raw && MODES.includes(raw as ContrastMode)) return raw as ContrastMode;
  return null;
}

/** Shared contrast preference for all CD exam sections in a session. */
export function useExamContrast(sessionId: string) {
  const [contrast, setContrast] = useState<ContrastMode>("black-on-white");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved =
        parseContrast(sessionStorage.getItem(contrastStorageKey(sessionId))) ??
        parseContrast(sessionStorage.getItem(legacyContrastStorageKey(sessionId)));
      if (saved) setContrast(saved);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [sessionId]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(contrastStorageKey(sessionId), contrast);
  }, [contrast, sessionId, hydrated]);

  return { contrast, setContrast };
}
