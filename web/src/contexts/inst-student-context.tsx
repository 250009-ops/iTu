"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getMe } from "@/lib/api/auth";
import { getStudentDashboard } from "@/lib/api/students";

export type InstStudentStatus = "active" | "pending" | "rejected" | "removed";

export interface InstStudentInfo {
  name: string;
  email: string;
  center: { id: string; name: string } | null;
  status: InstStudentStatus;
}

interface InstStudentContextValue {
  loading: boolean;
  /** True once we've confirmed the user is a center-scoped student. */
  isInstitutionStudent: boolean;
  info: InstStudentInfo | null;
  /** Drives the "My Mock" sidebar badge. */
  hasActiveMock: boolean;
}

const InstStudentContext = createContext<InstStudentContextValue | undefined>(
  undefined,
);

function normalizeStatus(raw?: string | null): InstStudentStatus {
  switch ((raw ?? "").toLowerCase()) {
    case "active":
      return "active";
    case "rejected":
      return "rejected";
    case "removed":
      return "removed";
    default:
      return "pending";
  }
}

export function InstStudentProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InstStudentInfo | null>(null);
  const [isInstitutionStudent, setIsInstitutionStudent] = useState(false);
  const [hasActiveMock, setHasActiveMock] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getMe()
      .then(async (user) => {
        if (cancelled) return;
        const linked = user.role === "student" && user.institution != null;
        setIsInstitutionStudent(linked);
        const status = normalizeStatus(user.studentProfile?.institutionStatus);
        setInfo({
          name: user.name,
          email: user.email,
          center: user.institution
            ? { id: user.institution.id, name: user.institution.name }
            : null,
          status,
        });

        if (linked && status === "active") {
          try {
            const dashboard = await getStudentDashboard();
            if (!cancelled) {
              const um = dashboard.upcomingMock;
              // Awaiting results is not an "active exam" for the nav badge;
              // the dashboard card still surfaces grading status separately.
              setHasActiveMock(
                um != null && um.status !== "awaiting_results",
              );
            }
          } catch {
            // Badge is best-effort; ignore failures.
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsInstitutionStudent(false);
          setInfo(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <InstStudentContext.Provider
      value={{ loading, isInstitutionStudent, info, hasActiveMock }}
    >
      {children}
    </InstStudentContext.Provider>
  );
}

export function useInstStudent(): InstStudentContextValue {
  const ctx = useContext(InstStudentContext);
  if (!ctx) {
    throw new Error("useInstStudent must be used within InstStudentProvider");
  }
  return ctx;
}
