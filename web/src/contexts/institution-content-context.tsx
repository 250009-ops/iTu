"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  cloneInstitutionContentTest,
  createInstitutionContentTest,
  deleteInstitutionContentTest,
  getInstitutionContentTest,
  getInstitutionContentTests,
  getNextInstitutionContentTestIdentity,
  publishInstitutionContentTest,
  updateInstitutionContentTest,
  uploadInstitutionContentMedia,
} from "@/lib/api/institution-content";
import { mapContentTests } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { ContentModule } from "@/lib/admin/types";
import {
  ContentStudioProvider,
  INSTITUTION_CONTENT_FEATURES,
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

export function InstitutionContentProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getInstitutionContentTests);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const noopAsync = useCallback(async () => {}, []);

  const createTest = useCallback(
    async (payload: CreateTestPayload) => {
      const created = await createInstitutionContentTest(payload);
      await refresh({ silent: true });
      setSelectedTestId(created.id);
      return { id: created.id, title: created.title };
    },
    [refresh],
  );

  const updateTest = useCallback(
    async (id: string, payload: Parameters<ContentStudioValue["updateTest"]>[1]) => {
      await updateInstitutionContentTest(id, payload);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const publishTest = useCallback(
    async (id: string) => {
      await publishInstitutionContentTest(id);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const cloneTest = useCallback(
    async (id: string) => {
      const cloned = await cloneInstitutionContentTest(id);
      await refresh({ silent: true });
      setSelectedTestId(cloned.id);
      return { id: cloned.id, title: cloned.title, code: cloned.code };
    },
    [refresh],
  );

  const deleteTest = useCallback(
    async (id: string) => {
      await deleteInstitutionContentTest(id);
      setSelectedTestId((current) => (current === id ? null : current));
      await refresh({ silent: true });
    },
    [refresh],
  );

  const fetchTest = useCallback((id: string) => getInstitutionContentTest(id), []);
  const uploadMedia = useCallback(
    (testId: string, key: string, file: File) =>
      uploadInstitutionContentMedia(testId, key, file),
    [],
  );
  const fetchNextIdentity = useCallback(
    (module: ContentModule) => getNextInstitutionContentTestIdentity(module),
    [],
  );

  const value = useMemo<ContentStudioValue>(() => {
    const mapped = data ? mapContentTests(data) : null;
    return {
      variant: "institution",
      features: INSTITUTION_CONTENT_FEATURES,
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
      archiveTest: noopAsync,
      retireAndDuplicate: async () => {
        throw new Error("Not available for institution content");
      },
      deleteTest,
      submitForReview: noopAsync,
      revertToDraft: noopAsync,
      importTest: async () => {
        throw new Error("Import is not available for institution content");
      },
      importAnswerKey: noopAsync,
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
    deleteTest,
    noopAsync,
    refresh,
  ]);

  return <ContentStudioProvider value={value}>{children}</ContentStudioProvider>;
}

export { useContentStudio } from "@/contexts/content-studio-context";
