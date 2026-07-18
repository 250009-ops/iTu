"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTestDialog } from "@/components/admin/content/create-test-dialog";
import { ImportContentDialog } from "@/components/admin/content/import-content-dialog";
import { useContentStudio } from "@/contexts/content-studio-context";
import type { ContentModule } from "@/lib/admin/types";

type Props = {
  activeModule: ContentModule;
};

export function ContentStudioHeader({ activeModule }: Props) {
  const { variant, features } = useContentStudio();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const isInstitution = variant === "institution";

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted">
            {isInstitution ? "Centre" : "Admin"} &gt; Content Studio
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Content Studio
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isInstitution
              ? "Digitize your paper mocks — only visible to your centre. Publish tests, then link them in your private packages."
              : "Build tests in the visual editor, preview inline, then publish and link them to packages."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {features.import && (
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import
            </Button>
          )}
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

      {features.import && (
        <ImportContentDialog
          open={importOpen}
          module={activeModule}
          onClose={() => setImportOpen(false)}
        />
      )}
    </>
  );
}
