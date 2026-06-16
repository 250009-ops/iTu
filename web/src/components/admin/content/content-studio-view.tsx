"use client";

import { useEffect, useState } from "react";
import { ContentStudioHeader } from "@/components/admin/content/content-studio-header";
import { ContentSummaryCards } from "@/components/admin/content/content-summary-cards";
import { ListeningEditor } from "@/components/admin/content/listening-editor";
import { ReadingEditor } from "@/components/admin/content/reading-editor";
import { SpeakingEditor } from "@/components/admin/content/speaking-editor";
import { WritingEditor } from "@/components/admin/content/writing-editor";
import { ModuleTabs } from "@/components/admin/content/module-tabs";
import { TestsTable } from "@/components/admin/content/tests-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminContentProvider,
  useAdminContent,
} from "@/contexts/admin-content-context";
import type { ContentModule } from "@/lib/admin/types";

const moduleEditors: Record<ContentModule, React.ComponentType> = {
  listening: ListeningEditor,
  reading: ReadingEditor,
  writing: WritingEditor,
  speaking: SpeakingEditor,
};

function ContentStudioContent() {
  const { loading, error, tests, selectedTestId, setSelectedTestId } =
    useAdminContent();
  const [activeModule, setActiveModule] = useState<ContentModule>("listening");
  const Editor = moduleEditors[activeModule];

  useEffect(() => {
    if (!selectedTestId) return;
    const selected = tests.find((t) => t.id === selectedTestId);
    if (selected && selected.module !== activeModule) {
      setSelectedTestId(null);
    }
  }, [activeModule, selectedTestId, tests, setSelectedTestId]);

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="min-h-0 pb-10 pt-4 lg:pt-6">
        <div className="mx-auto max-w-7xl space-y-6 px-4 lg:px-6 xl:px-8">
          <ContentStudioHeader activeModule={activeModule} />
          <ContentSummaryCards />
          <ModuleTabs active={activeModule} onChange={setActiveModule} />
          <TestsTable module={activeModule} />
          <Editor />
        </div>
      </div>
    </ApiDataShell>
  );
}

export function ContentStudioView() {
  return (
    <AdminContentProvider>
      <ContentStudioContent />
    </AdminContentProvider>
  );
}
