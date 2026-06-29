"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { contentModuleLabels } from "@/lib/admin/constants";
import {
  defaultTestTitle,
  moduleUsesAnswerKey,
  suggestTestCode,
} from "@/lib/admin/content-templates";
import { normalizeContent } from "@/lib/admin/content/normalize";
import { syncAnswerKey, type AnswerKeyMap } from "@/lib/admin/content/utils";
import { isPublishReady } from "@/components/admin/content/publish-checklist";
import type { ContentModule, TestStatus } from "@/lib/admin/types";
import { useAdminContent } from "@/contexts/admin-content-context";
import { getContentTest } from "@/lib/api/admin";
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
  archived: {
    label: "Retired",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-500",
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
  onPreviewTest?: () => void;
  onEditTest?: () => void;
}

export function TestsTable({ module, onPreviewTest, onEditTest }: TestsTableProps) {
  const {
    tests: contentTests,
    publishTest,
    cloneTest,
    archiveTest,
    retireAndDuplicate,
    submitForReview,
    revertToDraft,
    setSelectedTestId,
    selectedTestId,
  } = useAdminContent();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [retiringId, setRetiringId] = useState<string | null>(null);
  const moduleLabel = contentModuleLabels[module];

  async function handlePublish(id: string, name: string) {
    setPublishingId(id);
    try {
      const test = await getContentTest(id);
      const content = normalizeContent(module, (test.content ?? {}) as object);
      const answerKey = moduleUsesAnswerKey(module)
        ? syncAnswerKey(module, content, (test.answerKey ?? {}) as AnswerKeyMap)
        : ((test.answerKey ?? {}) as AnswerKeyMap);
      const mediaAssets = (test.mediaAssets ?? []).map((a) => ({
        key: a.key,
        url: a.url,
      }));

      if (!isPublishReady(module, content, answerKey, mediaAssets)) {
        toast("Not ready to publish", {
          description: "Open the editor and complete the checklist before publishing.",
          variant: "warning",
        });
        return;
      }

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

  async function handleClone(id: string, name: string) {
    setCloningId(id);
    try {
      const code = suggestTestCode(module);
      const title = `${name.replace(/\s+\d+$/, "").trim()} Copy`;
      await cloneTest(id, code, title || defaultTestTitle(module));
      toast("Test duplicated", {
        description: "Draft created with content and media copied.",
        variant: "success",
      });
    } catch (err) {
      toast("Could not duplicate test", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setCloningId(null);
    }
  }

  async function handleRetireAndDuplicate(id: string, name: string) {
    setRetiringId(id);
    try {
      const code = suggestTestCode(module);
      const title = `${name.replace(/\s+\d+$/, "").trim()} Copy`;
      const result = await retireAndDuplicate(
        id,
        code,
        title || defaultTestTitle(module),
      );
      onEditTest?.();
      toast(result.archived ? "Test retired" : "Draft copy created", {
        description: result.archived
          ? `${name} was retired and ${title} is ready to edit, publish, and assign.`
          : result.activePackageLinks > 0
            ? `${title} is ready to edit. Update ${result.activePackageLinks} active package(s), then retire the original.`
            : `${title} is ready to edit and publish.`,
        variant: "success",
      });
    } catch (err) {
      toast("Retire failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setRetiringId(null);
    }
  }

  async function handleRetire(id: string, name: string) {
    if (
      !window.confirm(
        `Retire ${name}?\n\nIt will be hidden from new package assignments. Existing exam history is preserved.`,
      )
    ) {
      return;
    }
    setRetiringId(id);
    try {
      await archiveTest(id);
      toast("Test retired", {
        description: `${name} is archived and no longer available for new packages.`,
        variant: "success",
      });
    } catch (err) {
      toast("Retire failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setRetiringId(null);
    }
  }

  async function handleSubmitReview(id: string, name: string) {
    setPublishingId(id);
    try {
      await submitForReview(id);
      toast("Submitted for review", {
        description: `${name} is ready for final approval.`,
        variant: "success",
      });
    } catch (err) {
      toast("Submit failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setPublishingId(null);
    }
  }

  async function handleRevertDraft(id: string, name: string) {
    setPublishingId(id);
    try {
      await revertToDraft(id);
      toast("Reverted to draft", { description: name, variant: "success" });
    } catch (err) {
      toast("Revert failed", {
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
                const isSelected = selectedTestId === test.id;
                return (
                  <tr
                    key={test.id}
                    className={isSelected ? "bg-sky-50/60" : "hover:bg-slate-50/80"}
                  >
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
                      {test.mediaCount > 0 && (
                        <span className="ml-1 text-xs text-slate-400">
                          · {test.mediaCount} media
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted sm:px-6">
                      {test.lastUpdated}
                    </td>
                    <td className="px-5 py-4 text-muted sm:px-6">{test.author}</td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant={isSelected ? "primary" : "secondary"}
                          size="sm"
                          className="h-8 px-3"
                          onClick={() => {
                            onEditTest?.();
                            setSelectedTestId(test.id);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 px-3"
                          loading={cloningId === test.id}
                          onClick={() => void handleClone(test.id, test.name)}
                        >
                          Duplicate
                        </Button>
                        {test.status === "published" ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-3"
                              onClick={() => {
                                onPreviewTest?.();
                                setSelectedTestId(test.id);
                              }}
                            >
                              Preview
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-3"
                              loading={retiringId === test.id}
                              onClick={() => void handleRetireAndDuplicate(test.id, test.name)}
                            >
                              Retire &amp; duplicate
                            </Button>
                            {(test.activePackageLinks ?? 0) === 0 && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 px-3"
                                loading={retiringId === test.id}
                                onClick={() => void handleRetire(test.id, test.name)}
                              >
                                Retire
                              </Button>
                            )}
                            {test.assignedMockLabel ? (
                              <span
                                className="flex h-8 max-w-[10rem] items-center truncate px-2 text-xs font-semibold text-sky-600"
                                title={
                                  test.assignedMockLabels?.length
                                    ? test.assignedMockLabels.join(", ")
                                    : test.assignedMockLabel
                                }
                              >
                                {test.assignedMockLabel}
                              </span>
                            ) : null}
                          </>
                        ) : test.status === "archived" ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-3"
                              onClick={() => {
                                onPreviewTest?.();
                                setSelectedTestId(test.id);
                              }}
                            >
                              Preview
                            </Button>
                            {test.assignedMockLabel ? (
                              <span className="flex h-8 items-center px-2 text-xs text-muted">
                                {test.assignedMockLabel}
                              </span>
                            ) : null}
                          </>
                        ) : test.status === "review" ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-3"
                              loading={publishingId === test.id}
                              onClick={() => void handleRevertDraft(test.id, test.name)}
                            >
                              Draft
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700"
                              loading={publishingId === test.id}
                              onClick={() => handlePublish(test.id, test.name)}
                            >
                              Publish
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-3"
                              loading={publishingId === test.id}
                              onClick={() => void handleSubmitReview(test.id, test.name)}
                            >
                              Review
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-3"
                              loading={publishingId === test.id}
                              onClick={() => handlePublish(test.id, test.name)}
                            >
                              Publish
                            </Button>
                          </>
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

