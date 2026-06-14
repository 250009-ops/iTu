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

    return subscribeSession(() => {
      setSession(getSession());
    });
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

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
