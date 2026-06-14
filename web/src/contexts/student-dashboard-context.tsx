"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStudentDashboard } from "@/hooks/use-student-dashboard";
import type { StudentDashboardResponse } from "@/lib/api/students";

type StudentDashboardContextValue = {
  data: StudentDashboardResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const StudentDashboardContext =
  createContext<StudentDashboardContextValue | null>(null);

export function StudentDashboardProvider({ children }: { children: ReactNode }) {
  const value = useStudentDashboard();
  return (
    <StudentDashboardContext.Provider value={value}>
      {children}
    </StudentDashboardContext.Provider>
  );
}

export function useStudentDashboardData() {
  const ctx = useContext(StudentDashboardContext);
  if (!ctx) {
    throw new Error(
      "useStudentDashboardData must be used within StudentDashboardProvider",
    );
  }
  return ctx;
}
