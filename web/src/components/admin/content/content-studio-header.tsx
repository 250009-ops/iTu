"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTestDialog } from "@/components/admin/content/create-test-dialog";
import { ImportContentDialog } from "@/components/admin/content/import-content-dialog";
import type { ContentModule } from "@/lib/admin/types";

type Props = {
  activeModule: ContentModule;
};

export function ContentStudioHeader({ activeModule }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted">
            Admin &gt; Content Studio
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Content Studio
          </h1>
          <p className="mt-1 text-sm text-muted">
            Build tests in the visual editor, preview inline, then publish and
            link them to packages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create New Test
          </Button>
        </div>
      </div>

      <CreateTestDialog
        open={createOpen}
        module={activeModule}
        onClose={() => setCreateOpen(false)}
      />

      <ImportContentDialog
        open={importOpen}
        module={activeModule}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}
