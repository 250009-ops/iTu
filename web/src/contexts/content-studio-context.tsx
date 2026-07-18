"use client";

import { createContext, useContext } from "react";
import type { ContentModule } from "@/lib/admin/types";

export type ContentStudioFeatures = {
  import: boolean;
  submitForReview: boolean;
  revertToDraft: boolean;
  archive: boolean;
  retireAndDuplicate: boolean;
};

export type ContentTestDetail = {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  durationMin: number;
  content: unknown;
  answerKey: unknown;
  mediaAssets: {
    id: string;
    key: string;
    url: string;
    mimeType: string;
    sizeBytes: number | null;
  }[];
};

export type ContentStudioValue = {
  variant: "admin" | "institution";
  features: ContentStudioFeatures;
  loading: boolean;
  error: string | null;
  tests: import("@/lib/admin/types").ContentTest[];
  moduleTabs: { id: ContentModule; label: string; count: number }[];
  summary: {
    total: number;
    published: number;
    underReview: number;
    drafts: number;
    archived: number;
  };
  selectedTestId: string | null;
  setSelectedTestId: (id: string | null) => void;
  fetchTest: (id: string) => Promise<ContentTestDetail>;
  uploadMedia: (
    testId: string,
    key: string,
    file: File,
  ) => Promise<{
    id: string;
    key: string;
    url: string;
    mimeType: string;
    sizeBytes: number | null;
  }>;
  fetchNextIdentity: (
    module: ContentModule,
  ) => Promise<{ code: string; title: string }>;
  createTest: (payload: {
    code: string;
    title: string;
    type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
    content: object;
    answerKey?: object;
    durationMin?: number;
  }) => Promise<{ id: string; title: string }>;
  updateTest: (
    id: string,
    payload: {
      title?: string;
      content?: object;
      answerKey?: object;
      durationMin?: number;
    },
  ) => Promise<void>;
  publishTest: (id: string) => Promise<void>;
  cloneTest: (id: string) => Promise<{ id: string; title: string; code: string }>;
  archiveTest: (id: string) => Promise<void>;
  retireAndDuplicate: (
    id: string,
  ) => Promise<{
    archived: boolean;
    activePackageLinks: number;
    cloneId: string;
    cloneTitle: string;
  }>;
  deleteTest: (id: string) => Promise<void>;
  submitForReview: (id: string) => Promise<void>;
  revertToDraft: (id: string) => Promise<void>;
  importTest: (payload: {
    code: string;
    title: string;
    type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
    content: object;
    answerKey?: object;
    durationMin?: number;
  }) => Promise<{ id: string; title: string }>;
  importAnswerKey: (id: string, csv: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export const ADMIN_CONTENT_FEATURES: ContentStudioFeatures = {
  import: true,
  submitForReview: true,
  revertToDraft: true,
  archive: true,
  retireAndDuplicate: true,
};

export const INSTITUTION_CONTENT_FEATURES: ContentStudioFeatures = {
  import: false,
  submitForReview: false,
  revertToDraft: false,
  archive: false,
  retireAndDuplicate: false,
};

const ContentStudioContext = createContext<ContentStudioValue | null>(null);

export function ContentStudioProvider({
  value,
  children,
}: {
  value: ContentStudioValue;
  children: React.ReactNode;
}) {
  return (
    <ContentStudioContext.Provider value={value}>
      {children}
    </ContentStudioContext.Provider>
  );
}

export function useContentStudio() {
  const ctx = useContext(ContentStudioContext);
  if (!ctx) {
    throw new Error("useContentStudio requires ContentStudioProvider");
  }
  return ctx;
}

/** @deprecated Use useContentStudio */
export function useAdminContent() {
  return useContentStudio();
}
