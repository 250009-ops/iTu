"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleTabs } from "@/components/admin/content/module-tabs";
import { ContentSummaryCards } from "@/components/admin/content/content-summary-cards";
import { TestsTable } from "@/components/admin/content/tests-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { PortalPage } from "@/components/portal/portal-page";
import {
  ContentStudioProvider,
  INSTITUTION_CONTENT_FEATURES,
  type ContentStudioValue,
} from "@/contexts/content-studio-context";
import { getInstitutionPurchasedTests } from "@/lib/api/institution-content";
import { mapContentTests } from "@/lib/api/mappers/admin";
import type { ContentModule } from "@/lib/admin/types";

function PurchasedStudioInner() {
  const [activeModule, setActiveModule] = useState<ContentModule>("listening");

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-10 pt-4 lg:pt-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col space-y-6 px-4 lg:px-6 xl:px-8">
        <div>
          <p className="text-xs font-medium text-muted">Centre &gt; Tests</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Purchased set
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Section tests included in your bought or granted test sets. These are
            read-only — assemble enrollable mocks on the{" "}
            <Link
              href="/institution/mocks"
              className="font-semibold text-navy underline"
            >
              Mocks
            </Link>{" "}
            page.
          </p>
        </div>
        <ContentSummaryCards />
        <ModuleTabs active={activeModule} onChange={setActiveModule} />
        <TestsTable module={activeModule} readOnly />
      </div>
    </div>
  );
}

export function PurchasedTestsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<Awaited<
    ReturnType<typeof getInstitutionPurchasedTests>
  > | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return getInstitutionPurchasedTests()
      .then((data) => {
        setRaw(data);
        setError(null);
      })
      .catch(() => setError("Failed to load purchased tests"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mapped = useMemo(() => {
    if (!raw) return null;
    const asContentTests = raw.tests.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      type: t.type,
      status: t.status,
      version: t.version,
      durationMin: t.durationMin,
      updatedAt: t.updatedAt,
      publishedAt: t.publishedAt,
      questionCount: 0,
      mediaCount: 0,
      authorName: "iTestU",
      linkedPackages: 0,
      activePackageLinks: 0,
      assignedMockLabel: t.sourceMockLabel ?? t.sourcePackageTitle,
      assignedMockLabels: t.sourceMockLabel ? [t.sourceMockLabel] : [],
    }));
    return mapContentTests(asContentTests as never);
  }, [raw]);

  const studioValue = useMemo<ContentStudioValue>(() => {
    const noop = async () => {};
    return {
      variant: "institution",
      features: INSTITUTION_CONTENT_FEATURES,
      loading: false,
      error: null,
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
      selectedTestId: null,
      setSelectedTestId: () => undefined,
      refresh: load,
      createTest: async () => ({ id: "", title: "" }),
      updateTest: noop,
      publishTest: noop,
      cloneTest: async () => ({ id: "", title: "", code: "" }),
      deleteTest: noop,
      archiveTest: noop,
      retireAndDuplicate: async () => ({
        archived: false,
        cloneId: "",
        cloneTitle: "",
        activePackageLinks: 0,
      }),
      submitForReview: noop,
      revertToDraft: noop,
      importTest: async () => {
        throw new Error("Not available");
      },
      importAnswerKey: noop,
      fetchTest: async () => ({
        id: "",
        code: "",
        title: "",
        type: "LISTENING",
        status: "DRAFT",
        durationMin: 0,
        content: {},
        answerKey: {},
        mediaAssets: [],
      }),
      fetchNextIdentity: async () => ({ code: "", title: "" }),
      uploadMedia: async () => ({
        id: "",
        key: "",
        url: "",
        mimeType: "",
        sizeBytes: null,
      }),
    };
  }, [mapped, load]);

  return (
    <ApiDataShell loading={loading} error={error}>
      {!raw || raw.tests.length === 0 ? (
        <PortalPage>
          <div className="rounded-xl border border-dashed border-border bg-slate-50 px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-navy">
              No purchased tests yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Buy a test set to unlock section tests here, then assemble mocks for
              student enrollment on the Mocks page.
            </p>
            <Link href="/institution/mocks/shop" className="mt-6 inline-block">
              <Button variant="primary" size="sm">
                Buy test sets
              </Button>
            </Link>
          </div>
        </PortalPage>
      ) : (
        <ContentStudioProvider value={studioValue}>
          <PurchasedStudioInner />
        </ContentStudioProvider>
      )}
    </ApiDataShell>
  );
}
