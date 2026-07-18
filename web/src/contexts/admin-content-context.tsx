"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  archiveContentTest,
  createContentTest,
  cloneContentTest,
  deleteContentTest,
  getContentTest,
  getContentTests,
  importAnswerKeyCsv,
  importContentTest,
  publishContentTest,
  retireAndDuplicateContentTest,
  revertContentTestToDraft,
  submitContentTestForReview,
  updateContentTest,
  uploadContentMedia,
  getNextContentTestIdentity,
} from "@/lib/api/admin";
import { mapContentTests } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { ContentModule } from "@/lib/admin/types";
import {
  ADMIN_CONTENT_FEATURES,
  ContentStudioProvider,
  type ContentStudioValue,
} from "@/contexts/content-studio-context";

type CreateTestPayload = {
  code: string;
  title: string;
  type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  content: object;
  answerKey?: object;
  durationMin?: number;
};

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
    async (id: string, payload: Parameters<ContentStudioValue["updateTest"]>[1]) => {
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
    async (id: string) => {
      const cloned = await cloneContentTest(id);
      await refresh();
      setSelectedTestId(cloned.id);
      return { id: cloned.id, title: cloned.title, code: cloned.code };
    },
    [refresh],
  );

  const archiveTest = useCallback(
    async (id: string) => {
      await archiveContentTest(id);
      await refresh();
    },
    [refresh],
  );

  const retireAndDuplicate = useCallback(
    async (id: string) => {
      const result = await retireAndDuplicateContentTest(id);
      await refresh();
      setSelectedTestId(result.clone.id);
      return {
        archived: result.archived,
        activePackageLinks: result.activePackageLinks,
        cloneId: result.clone.id,
        cloneTitle: result.clone.title,
      };
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

  const fetchTest = useCallback((id: string) => getContentTest(id), []);
  const uploadMedia = useCallback(
    (testId: string, key: string, file: File) => uploadContentMedia(testId, key, file),
    [],
  );
  const fetchNextIdentity = useCallback(
    (module: ContentModule) => getNextContentTestIdentity(module),
    [],
  );

  const value = useMemo<ContentStudioValue>(() => {
    const mapped = data ? mapContentTests(data) : null;
    return {
      variant: "admin",
      features: ADMIN_CONTENT_FEATURES,
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
        archived: 0,
      },
      selectedTestId,
      setSelectedTestId,
      fetchTest,
      uploadMedia,
      fetchNextIdentity,
      createTest,
      updateTest,
      publishTest,
      cloneTest,
      archiveTest,
      retireAndDuplicate,
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
    fetchTest,
    uploadMedia,
    fetchNextIdentity,
    createTest,
    updateTest,
    publishTest,
    cloneTest,
    archiveTest,
    retireAndDuplicate,
    deleteTest,
    submitForReview,
    revertToDraft,
    importTest,
    importAnswerKey,
    refresh,
  ]);

  return <ContentStudioProvider value={value}>{children}</ContentStudioProvider>;
}

export { useAdminContent, useContentStudio } from "@/contexts/content-studio-context";
