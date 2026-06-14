"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { getContentTests, publishContentTest } from "@/lib/api/admin";
import { mapContentTests } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { ContentTest } from "@/lib/admin/types";

type ContentValue = {
  loading: boolean;
  error: string | null;
  tests: ContentTest[];
  moduleTabs: ReturnType<typeof mapContentTests>["moduleTabs"];
  summary: ReturnType<typeof mapContentTests>["summary"];
  publishTest: (id: string) => Promise<void>;
};

const AdminContentContext = createContext<ContentValue | null>(null);

export function AdminContentProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getContentTests);

  const publishTest = useCallback(
    async (id: string) => {
      await publishContentTest(id);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<ContentValue>(() => {
    const mapped = data ? mapContentTests(data) : null;
    return {
      loading,
      error,
      tests: mapped?.tests ?? [],
      moduleTabs: mapped?.moduleTabs ?? [
        { id: "listening", label: "Listening", count: 0 },
        { id: "reading", label: "Reading", count: 0 },
        { id: "writing", label: "Writing", count: 0 },
        { id: "speaking", label: "Speaking", count: 0 },
      ],
      summary: mapped?.summary ?? {
        total: 0,
        published: 0,
        underReview: 0,
        drafts: 0,
      },
      publishTest,
    };
  }, [data, loading, error, publishTest]);

  return (
    <AdminContentContext.Provider value={value}>
      {children}
    </AdminContentContext.Provider>
  );
}

export function useAdminContent() {
  const ctx = useContext(AdminContentContext);
  if (!ctx) {
    throw new Error("useAdminContent requires AdminContentProvider");
  }
  return ctx;
}
