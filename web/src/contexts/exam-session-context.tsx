"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  checkIn,
  getExamSession,
  type ExamSessionResponse,
} from "@/lib/api/exam";
import { getErrorMessage } from "@/lib/api/errors";

type ExamSessionContextValue = {
  sessionCode: string;
  session: ExamSessionResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  performCheckIn: () => Promise<ExamSessionResponse>;
};

const ExamSessionContext = createContext<ExamSessionContextValue | null>(null);

export function ExamSessionProvider({
  sessionCode,
  children,
}: {
  sessionCode: string;
  children: ReactNode;
}) {
  const [session, setSession] = useState<ExamSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExamSession(sessionCode);
      setSession(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load exam session"));
    } finally {
      setLoading(false);
    }
  }, [sessionCode]);

  const performCheckIn = useCallback(async () => {
    const data = await checkIn(sessionCode);
    setSession(data);
    return data;
  }, [sessionCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ExamSessionContext.Provider
      value={{ sessionCode, session, loading, error, refresh, performCheckIn }}
    >
      {children}
    </ExamSessionContext.Provider>
  );
}

export function useExamSessionContext() {
  const ctx = useContext(ExamSessionContext);
  if (!ctx) {
    throw new Error("useExamSessionContext requires ExamSessionProvider");
  }
  return ctx;
}
