"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStudentProfile } from "@/hooks/use-student-profile";
import type { StudentProfileUi } from "@/lib/api/mappers/student";
import type { UpdateProfileBody } from "@/lib/api/students";

type StudentProfileContextValue = {
  profile: StudentProfileUi | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  update: (body: UpdateProfileBody) => Promise<void>;
};

const StudentProfileContext =
  createContext<StudentProfileContextValue | null>(null);

export function StudentProfileProvider({ children }: { children: ReactNode }) {
  const value = useStudentProfile();
  return (
    <StudentProfileContext.Provider value={value}>
      {children}
    </StudentProfileContext.Provider>
  );
}

export function useStudentProfileData() {
  const ctx = useContext(StudentProfileContext);
  if (!ctx) {
    throw new Error(
      "useStudentProfileData must be used within StudentProfileProvider",
    );
  }
  return ctx;
}
