"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { contentModuleLabels } from "@/lib/admin/constants";
import type { ContentModule, TestStatus } from "@/lib/admin/types";
import { useAdminContent } from "@/contexts/admin-content-context";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const statusStyles: Record<
  TestStatus,
  { label: string; dot: string; pill: string }
> = {
  published: {
    label: "Published",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
  draft: {
    label: "Draft",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600",
  },
  review: {
    label: "Under Review",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700",
  },
};

const moduleBadge: Record<ContentModule, string> = {
  listening: "bg-sky-50 text-sky-700",
  reading: "bg-emerald-50 text-emerald-700",
  writing: "bg-violet-50 text-violet-700",
  speaking: "bg-rose-50 text-rose-700",
};

interface TestsTableProps {
  module: ContentModule;
}

export function TestsTable({ module }: TestsTableProps) {
  const { tests: contentTests, publishTest } = useAdminContent();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const moduleLabel = contentModuleLabels[module];

  async function handlePublish(id: string, name: string) {
    setPublishingId(id);
    try {
      await publishTest(id);
      toast("Test published", {
        description: `${name} is now live for packages.`,
        variant: "success",
      });
    } catch (err) {
      toast("Failed to publish test", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setPublishingId(null);
    }
  }

  const filtered = useMemo(() => {
    const tests = contentTests.filter((t) => t.module === module);
    if (!query.trim()) return tests;
    const q = query.toLowerCase();
    return tests.filter((t) => t.name.toLowerCase().includes(q));
  }, [contentTests, module, query]);

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 className="font-semibold text-navy">{moduleLabel} Tests</h2>
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search tests…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">Test Name</th>
              <th className="px-5 py-3 sm:px-6">Type</th>
              <th className="px-5 py-3 sm:px-6">Status</th>
              <th className="px-5 py-3 sm:px-6">Questions</th>
              <th className="px-5 py-3 sm:px-6">Last Updated</th>
              <th className="px-5 py-3 sm:px-6">Author</th>
              <th className="px-5 py-3 text-right sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted sm:px-6">
                  No tests found.
                </td>
              </tr>
            ) : (
              filtered.map((test) => {
                const status = statusStyles[test.status];
                return (
                  <tr key={test.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-semibold text-navy sm:px-6">
                      {test.name}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          moduleBadge[test.module],
                        )}
                      >
                        {contentModuleLabels[test.module]}
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          status.pill,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted sm:px-6">
                      {test.questions}
                    </td>
                    <td className="px-5 py-4 text-muted sm:px-6">
                      {test.lastUpdated}
                    </td>
                    <td className="px-5 py-4 text-muted sm:px-6">{test.author}</td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex justify-end">
                        {test.status === "published" ? (
                          <span className="text-xs font-medium text-muted">
                            Live
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3"
                            loading={publishingId === test.id}
                            onClick={() => handlePublish(test.id, test.name)}
                          >
                            Publish
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

