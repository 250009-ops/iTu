"use client";

import { Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ContentStudioHeader() {
  const { toast } = useToast();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">
          Admin &gt; Content Studio
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Content Studio
        </h1>
        <p className="mt-1 text-sm text-muted">
          Author, review, and publish exam content across all four modules.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            toast("Filters", {
              description: "Filter tests by module, status and author.",
              variant: "info",
            })
          }
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            toast("New test", {
              description: "The authoring wizard for a new test is coming soon.",
              variant: "info",
            })
          }
        >
          <Plus className="h-4 w-4" />
          Create New Test
        </Button>
      </div>
    </div>
  );
}
