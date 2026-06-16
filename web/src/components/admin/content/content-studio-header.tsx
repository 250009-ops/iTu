"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTestDialog } from "@/components/admin/content/create-test-dialog";
import type { ContentModule } from "@/lib/admin/types";

type Props = {
  activeModule: ContentModule;
};

export function ContentStudioHeader({ activeModule }: Props) {
  const [createOpen, setCreateOpen] = useState(false);

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
            Create drafts from templates, upload listening audio to VPS storage,
            edit JSON, and publish to packages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
    </>
  );
}
