"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStudentMockDay } from "@/hooks/use-student-mock-day";
import type { MockDaySession } from "@/lib/api/mappers/student";

type StudentMockDayContextValue = {
  data: MockDaySession | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const StudentMockDayContext =
  createContext<StudentMockDayContextValue | null>(null);

export function StudentMockDayProvider({ children }: { children: ReactNode }) {
  const value = useStudentMockDay();
  return (
    <StudentMockDayContext.Provider value={value}>
      {children}
    </StudentMockDayContext.Provider>
  );
}

export function useStudentMockDayData() {
  const ctx = useContext(StudentMockDayContext);
  if (!ctx) {
    throw new Error(
      "useStudentMockDayData must be used within StudentMockDayProvider",
    );
  }
  return ctx;
}
