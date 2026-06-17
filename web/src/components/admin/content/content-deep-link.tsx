"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminContent } from "@/contexts/admin-content-context";
import type { ContentModule } from "@/lib/admin/types";

type ContentDeepLinkProps = {
  activeModule: ContentModule;
  onModuleChange: (module: ContentModule) => void;
  onPreviewTab: () => void;
};

const MODULES: ContentModule[] = ["listening", "reading", "writing", "speaking"];

function parseModule(value: string | null): ContentModule | null {
  if (!value) return null;
  const normalized = value.toLowerCase() as ContentModule;
  return MODULES.includes(normalized) ? normalized : null;
}

export function ContentDeepLink({
  activeModule,
  onModuleChange,
  onPreviewTab,
}: ContentDeepLinkProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tests, loading, setSelectedTestId } = useAdminContent();
  const testId = searchParams.get("test");
  const tab = searchParams.get("tab");
  const moduleParam = parseModule(searchParams.get("module"));

  useEffect(() => {
    if (!testId || loading) return;

    const match = tests.find((t) => t.id === testId);
    if (!match) return;

    if (match.module !== activeModule) {
      onModuleChange(match.module);
    }
    setSelectedTestId(testId);
    if (tab === "preview") {
      onPreviewTab();
    }

    router.replace("/admin/content", { scroll: false });
  }, [
    testId,
    tab,
    moduleParam,
    loading,
    tests,
    activeModule,
    onModuleChange,
    onPreviewTab,
    setSelectedTestId,
    router,
  ]);

  useEffect(() => {
    if (!moduleParam || moduleParam === activeModule) return;
    onModuleChange(moduleParam);
  }, [moduleParam, activeModule, onModuleChange]);

  return null;
}
