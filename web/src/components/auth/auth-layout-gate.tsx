"use client";

import type { ReactNode } from "react";
import { GuestGuard } from "./guest-guard";

export function AuthLayoutGate({ children }: { children: ReactNode }) {
  return <GuestGuard>{children}</GuestGuard>;
}
