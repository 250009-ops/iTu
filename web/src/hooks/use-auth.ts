"use client";

import { useEffect, useState } from "react";
import {
  clearSession,
  getSession,
  subscribeSession,
  type AuthSession,
} from "@/lib/auth/session";

export function useAuth() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setIsHydrated(true);
    setSession(getSession());

    const sync = () => setSession(getSession());

    const unsubscribe = subscribeSession(sync);

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  function signOut() {
    clearSession();
  }

  return {
    session,
    signOut,
    isAuthenticated: session != null,
    isHydrated,
  };
}

const HONORIFIC_PREFIXES = new Set([
  "dr",
  "mr",
  "mrs",
  "ms",
  "miss",
  "prof",
  "sir",
  "dame",
]);

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((part) => {
      const normalized = part.toLowerCase().replace(/\./g, "");
      return part.length > 0 && !HONORIFIC_PREFIXES.has(normalized);
    })
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
