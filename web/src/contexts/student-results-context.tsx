"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStudentResults } from "@/hooks/use-student-results";
import type { StudentResultsData } from "@/lib/api/mappers/student";

type StudentResultsContextValue = {
  data: StudentResultsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const StudentResultsContext =
  createContext<StudentResultsContextValue | null>(null);

export function StudentResultsProvider({ children }: { children: ReactNode }) {
  const value = useStudentResults();
  return (
    <StudentResultsContext.Provider value={value}>
      {children}
    </StudentResultsContext.Provider>
  );
}

export function useStudentResultsData() {
  const ctx = useContext(StudentResultsContext);
  if (!ctx) {
    throw new Error(
      "useStudentResultsData must be used within StudentResultsProvider",
    );
  }
  return ctx;
}
