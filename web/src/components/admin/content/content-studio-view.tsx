"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ContentStudioHeader } from "@/components/admin/content/content-studio-header";
import { ContentSummaryCards } from "@/components/admin/content/content-summary-cards";
import { ContentDeepLink } from "@/components/admin/content/content-deep-link";
import { PracticeStudioView } from "@/components/admin/content/practice/practice-studio-view";
import { ListeningEditor } from "@/components/admin/content/listening-editor";
import { ReadingEditor } from "@/components/admin/content/reading-editor";
import { SpeakingEditor } from "@/components/admin/content/speaking-editor";
import { WritingEditor } from "@/components/admin/content/writing-editor";
import { ModuleTabs } from "@/components/admin/content/module-tabs";
import { TestsTable } from "@/components/admin/content/tests-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { AdminContentProvider, useAdminContent } from "@/contexts/admin-content-context";
import type { ContentModule } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type EditorTab = "visual" | "preview";

type ModuleEditorProps = {
  initialTab?: EditorTab;
  focused?: boolean;
};

const moduleEditors: Record<
  ContentModule,
  React.ComponentType<ModuleEditorProps>
> = {
  listening: ListeningEditor,
  reading: ReadingEditor,
  writing: WritingEditor,
  speaking: SpeakingEditor,
};

function ContentStudioInner() {
  const { loading, error, tests, selectedTestId, setSelectedTestId } =
    useAdminContent();
  const [activeModule, setActiveModule] = useState<ContentModule>("listening");
  const [editorTab, setEditorTab] = useState<EditorTab>("visual");
  const Editor = moduleEditors[activeModule];

  const openPreviewTab = useCallback(() => {
    setEditorTab("preview");
  }, []);

  useEffect(() => {
    if (!selectedTestId) return;
    const selected = tests.find((t) => t.id === selectedTestId);
    if (selected && selected.module !== activeModule) {
      setSelectedTestId(null);
      setEditorTab("visual");
    }
  }, [activeModule, selectedTestId, tests, setSelectedTestId]);

  const isEditing = Boolean(selectedTestId);
  const selectedTest = tests.find((t) => t.id === selectedTestId);

  useEffect(() => {
    if (loading || !selectedTestId) return;
    if (!tests.some((t) => t.id === selectedTestId)) {
      setSelectedTestId(null);
    }
  }, [loading, selectedTestId, tests, setSelectedTestId]);

  useEffect(() => {
    if (!selectedTestId) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedTestId]);

  return (
    <ApiDataShell loading={loading} error={error}>
      <ContentDeepLink
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onPreviewTab={openPreviewTab}
      />
      <div
        className={cn(
          "min-h-0 pt-4 lg:pt-6",
          isEditing ? "flex flex-col pb-6" : "pb-10",
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-7xl flex-col px-4 lg:px-6 xl:px-8",
            isEditing ? "min-h-[calc(100dvh-4.5rem)] flex-1 gap-4" : "space-y-6",
          )}
        >
          <ContentStudioHeader activeModule={activeModule} />

          {isEditing ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedTestId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to tests
                </Button>
                {selectedTest && (
                  <p className="text-sm text-muted">
                    Editing{" "}
                    <span className="font-semibold text-navy">{selectedTest.name}</span>
                  </p>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <Editor initialTab={editorTab} focused />
              </div>
            </>
          ) : (
            <>
              <ContentSummaryCards />
              <ModuleTabs active={activeModule} onChange={setActiveModule} />
              <TestsTable
                module={activeModule}
                onPreviewTest={openPreviewTab}
                onEditTest={() => setEditorTab("visual")}
              />
            </>
          )}
        </div>
      </div>
    </ApiDataShell>
  );
}

function StudioModeBar({ active }: { active: "mock" | "practice" }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
      <div className="mx-auto flex max-w-7xl gap-2">
        <a
          href="/admin/content"
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium",
            active === "mock" ? "bg-navy text-white" : "text-muted hover:bg-slate-100",
          )}
        >
          Mock Creation
        </a>
        <a
          href="/admin/content?mode=practice"
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium",
            active === "practice"
              ? "bg-navy text-white"
              : "text-muted hover:bg-slate-100",
          )}
        >
          Practice Creation
        </a>
      </div>
    </div>
  );
}

function ContentStudioViewWithMode() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "practice" ? "practice" : "mock";

  if (mode === "practice") {
    return (
      <div>
        <StudioModeBar active="practice" />
        <PracticeStudioView />
      </div>
    );
  }

  return (
    <AdminContentProvider>
      <StudioModeBar active="mock" />
      <ContentStudioInner />
    </AdminContentProvider>
  );
}

export function ContentStudioView() {
  return (
    <Suspense fallback={null}>
      <ContentStudioViewWithMode />
    </Suspense>
  );
}

export { ContentStudioInner };
