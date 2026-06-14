"use client";

import type { ReactNode } from "react";
import { ExamSessionProvider } from "@/contexts/exam-session-context";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { useExamSessionContext } from "@/contexts/exam-session-context";

function ExamSessionGate({ children }: { children: ReactNode }) {
  const { loading, error } = useExamSessionContext();
  return (
    <ApiDataShell loading={loading} error={error}>
      {children}
    </ApiDataShell>
  );
}

export function ExamSessionShell({
  sessionCode,
  children,
}: {
  sessionCode: string;
  children: ReactNode;
}) {
  return (
    <ExamSessionProvider sessionCode={sessionCode}>
      <ExamSessionGate>{children}</ExamSessionGate>
    </ExamSessionProvider>
  );
}
