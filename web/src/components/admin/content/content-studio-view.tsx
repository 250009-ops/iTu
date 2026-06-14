"use client";

import { useState } from "react";
import { ContentStudioHeader } from "@/components/admin/content/content-studio-header";
import { ContentSummaryCards } from "@/components/admin/content/content-summary-cards";
import { ListeningEditor } from "@/components/admin/content/listening-editor";
import { ModuleTabs } from "@/components/admin/content/module-tabs";
import { TestsTable } from "@/components/admin/content/tests-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminContentProvider,
  useAdminContent,
} from "@/contexts/admin-content-context";
import type { ContentModule } from "@/lib/admin/types";

function ContentStudioContent() {
  const { loading, error } = useAdminContent();
  const [activeModule, setActiveModule] = useState<ContentModule>("listening");

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <ContentStudioHeader />
          <ContentSummaryCards />
          <ModuleTabs active={activeModule} onChange={setActiveModule} />
          <TestsTable module={activeModule} />
          {activeModule === "listening" && <ListeningEditor />}
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
