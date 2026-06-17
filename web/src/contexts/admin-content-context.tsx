"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createContentTest,
  cloneContentTest,
  deleteContentTest,
  getContentTests,
  importAnswerKeyCsv,
  importContentTest,
  publishContentTest,
  revertContentTestToDraft,
  submitContentTestForReview,
  updateContentTest,
} from "@/lib/api/admin";
import { mapContentTests } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { ContentModule, ContentTest } from "@/lib/admin/types";

type CreateTestPayload = {
  code: string;
  title: string;
  type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  content: object;
  answerKey?: object;
  durationMin?: number;
};

type UpdateTestPayload = {
  title?: string;
  content?: object;
  answerKey?: object;
  durationMin?: number;
};

type ContentValue = {
  loading: boolean;
  error: string | null;
  tests: ContentTest[];
  moduleTabs: ReturnType<typeof mapContentTests>["moduleTabs"];
  summary: ReturnType<typeof mapContentTests>["summary"];
  selectedTestId: string | null;
  setSelectedTestId: (id: string | null) => void;
  createTest: (payload: CreateTestPayload) => Promise<{ id: string; title: string }>;
  updateTest: (id: string, payload: UpdateTestPayload) => Promise<void>;
  publishTest: (id: string) => Promise<void>;
  cloneTest: (id: string, code: string, title: string) => Promise<{ id: string }>;
  deleteTest: (id: string) => Promise<void>;
  submitForReview: (id: string) => Promise<void>;
  revertToDraft: (id: string) => Promise<void>;
  importTest: (payload: CreateTestPayload) => Promise<{ id: string; title: string }>;
  importAnswerKey: (id: string, csv: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AdminContentContext = createContext<ContentValue | null>(null);

export function AdminContentProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getContentTests);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const createTest = useCallback(
    async (payload: CreateTestPayload) => {
      const created = await createContentTest(payload);
      await refresh();
      setSelectedTestId(created.id as string);
      return { id: created.id as string, title: created.title as string };
    },
    [refresh],
  );

  const updateTest = useCallback(
    async (id: string, payload: UpdateTestPayload) => {
      await updateContentTest(id, payload);
      await refresh();
    },
    [refresh],
  );

  const publishTest = useCallback(
    async (id: string) => {
      await publishContentTest(id);
      await refresh();
    },
    [refresh],
  );

  const cloneTest = useCallback(
    async (id: string, code: string, title: string) => {
      const cloned = await cloneContentTest(id, { code, title });
      await refresh();
      setSelectedTestId(cloned.id);
      return { id: cloned.id };
    },
    [refresh],
  );

  const deleteTest = useCallback(
    async (id: string) => {
      await deleteContentTest(id);
      setSelectedTestId((current) => (current === id ? null : current));
      await refresh();
    },
    [refresh],
  );

  const submitForReview = useCallback(
    async (id: string) => {
      await submitContentTestForReview(id);
      await refresh();
    },
    [refresh],
  );

  const revertToDraft = useCallback(
    async (id: string) => {
      await revertContentTestToDraft(id);
      await refresh();
    },
    [refresh],
  );

  const importTest = useCallback(
    async (payload: CreateTestPayload) => {
      const created = await importContentTest(payload);
      await refresh();
      setSelectedTestId(created.id);
      return { id: created.id, title: created.title };
    },
    [refresh],
  );

  const importAnswerKey = useCallback(
    async (id: string, csv: string) => {
      await importAnswerKeyCsv(id, csv);
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
      selectedTestId,
      setSelectedTestId,
      createTest,
      updateTest,
      publishTest,
      cloneTest,
      deleteTest,
      submitForReview,
      revertToDraft,
      importTest,
      importAnswerKey,
      refresh,
    };
  }, [
    data,
    loading,
    error,
    selectedTestId,
    createTest,
    updateTest,
    publishTest,
    cloneTest,
    deleteTest,
    submitForReview,
    revertToDraft,
    importTest,
    importAnswerKey,
    refresh,
  ]);

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
