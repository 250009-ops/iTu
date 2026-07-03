"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStudentBrowse } from "@/hooks/use-student-browse";
import type { BrowseOffer } from "@/lib/api/mappers/student";

type StudentBrowseContextValue = {
  offers: BrowseOffer[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const StudentBrowseContext = createContext<StudentBrowseContextValue | null>(
  null,
);

export function StudentBrowseProvider({ children }: { children: ReactNode }) {
  const value = useStudentBrowse();
  return (
    <StudentBrowseContext.Provider value={value}>
      {children}
    </StudentBrowseContext.Provider>
  );
}

export function useStudentBrowseData() {
  const ctx = useContext(StudentBrowseContext);
  if (!ctx) {
    throw new Error(
      "useStudentBrowseData must be used within StudentBrowseProvider",
    );
  }
  return ctx;
}
