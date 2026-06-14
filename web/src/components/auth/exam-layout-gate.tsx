"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "./auth-guard";

export function ExamLayoutGate({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={["student", "admin"]}>{children}</AuthGuard>
  );
}
