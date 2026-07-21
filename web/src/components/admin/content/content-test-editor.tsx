"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListeningVisualEditor } from "@/components/admin/content/editors/listening-visual-editor";
import { ReadingVisualEditor } from "@/components/admin/content/editors/reading-visual-editor";
import { SpeakingVisualEditor } from "@/components/admin/content/editors/speaking-visual-editor";
import { WritingVisualEditor } from "@/components/admin/content/editors/writing-visual-editor";
import { ContentPreviewPanel } from "@/components/admin/content/preview/content-preview-panel";
import {
  isPublishReady,
  PublishChecklist,
} from "@/components/admin/content/publish-checklist";
import {
  moduleUsesAnswerKey,
} from "@/lib/admin/content-templates";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { normalizeTextAlternativesForSave } from "@/lib/admin/content/answer-key-alternatives";
import { syncAnswerKey } from "@/lib/admin/content/utils";
import type { MediaAssetRef } from "@/lib/admin/content/listening-media";
import { normalizeContent } from "@/lib/admin/content/normalize";
import type { ContentModule } from "@/lib/admin/types";
import { useContentStudio } from "@/contexts/content-studio-context";
import { ApiError, getErrorMessage } from "@/lib/api/errors";
import type {
  ListeningContent,
  ReadingContent,
  SpeakingContent,
  WritingContent,
} from "@/lib/exam/types";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type EditorTestStatus = "draft" | "under_review" | "published" | "archived";

export function normalizeEditorTestStatus(status: string): EditorTestStatus {
  const s = status.toLowerCase().replace(/-/g, "_");
  if (s === "published") return "published";
  if (s === "under_review" || s === "review") return "under_review";
  if (s === "archived") return "archived";
  return "draft";
}

type EditorTab = "visual" | "preview";

type Props = {
  module: ContentModule;
  testId: string | null;
  initialTab?: EditorTab;
  /** Fills the Content Studio edit workspace instead of sitting below the tests table. */
  focused?: boolean;
};

export function ContentTestEditor({
  module,
  testId,
  initialTab = "visual",
  focused = false,
}: Props) {
  const {
    updateTest,
    publishTest,
    submitForReview,
    revertToDraft,
    deleteTest,
    retireAndDuplicate,
    cloneTest,
    tests,
    setSelectedTestId,
    fetchTest,
    features,
  } = useContentStudio();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [cloningId, setCloningId] = useState(false);
  const [tab, setTab] = useState<EditorTab>(initialTab);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<EditorTestStatus>("draft");
  const [durationMin, setDurationMin] = useState(60);
  const [content, setContent] = useState<object>({});
  const [answerKey, setAnswerKey] = useState<AnswerKeyMap>({});
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRef[]>([]);
  const [loadedTestId, setLoadedTestId] = useState<string | null>(null);

  const showAnswerKey = moduleUsesAnswerKey(module);

  function handleMissingTest(action: string) {
    setSelectedTestId(null);
    toast(`${action} failed`, {
      description:
        "This test no longer exists on the server. Create a new draft or pick another test from the list.",
      variant: "error",
    });
  }

  function handleContentError(err: unknown, action: string): boolean {
    if (err instanceof ApiError && err.status === 404) {
      handleMissingTest(action);
      return true;
    }
    return false;
  }

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, testId]);

  useEffect(() => {
    if (!testId) {
      setLoadedTestId(null);
      setTitle("");
      setCode("");
      setStatus("draft");
      setContent({});
      setAnswerKey({});
      setMediaAssets([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadedTestId(null);
    void fetchTest(testId)
      .then((test) => {
        if (!active) return;
        setTitle(test.title);
        setCode(test.code);
        setStatus(normalizeEditorTestStatus(test.status));
        setDurationMin(test.durationMin ?? 60);
        const c = normalizeContent(module, (test.content ?? {}) as object);
        const k = (test.answerKey ?? {}) as AnswerKeyMap;
        const syncedKey = moduleUsesAnswerKey(module)
          ? syncAnswerKey(module, c, k)
          : k;
        setContent(c);
        setAnswerKey(syncedKey);
        setMediaAssets(
          (test.mediaAssets ?? []).map((a) => ({
            key: a.key,
            url: a.url,
          })),
        );
        setLoadedTestId(testId);
      })
      .catch((err) => {
        if (!active) return;
        setLoadedTestId(null);
        if (handleContentError(err, "Load")) return;
        toast("Failed to load test", {
          description: getErrorMessage(err, "Failed to load test"),
          variant: "error",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [testId, toast, module]);

  const listStatus = tests.find((t) => t.id === testId)?.status;
  useEffect(() => {
    if (!testId || !listStatus) return;
    setStatus(normalizeEditorTestStatus(listStatus));
  }, [testId, listStatus]);

  function handleContentChange(next: object) {
    setContent(next);
    if (showAnswerKey) {
      setAnswerKey((prev) => syncAnswerKey(module, next, prev));
    }
  }

  function handleAnswerKeyChange(next: AnswerKeyMap) {
    setAnswerKey(next);
  }

  function refreshMediaAssets() {
    if (!testId) return;
    void fetchTest(testId).then((test) => {
      setMediaAssets(
        (test.mediaAssets ?? []).map((a) => ({
          key: a.key,
          url: a.url,
          sizeBytes: a.sizeBytes,
        })),
      );
    });
  }

  useEffect(() => {
    if (
      tab === "preview" &&
      testId &&
      (module === "listening" || module === "writing")
    ) {
      refreshMediaAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when opening preview
  }, [tab, testId, module]);

  if (!testId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-50 px-5 py-10 text-center text-sm text-muted">
        Select a test from the table above, or create a new draft.
      </div>
    );
  }

  const contentReady = loadedTestId === testId;
  const isLocked = status === "published" || status === "archived";

  if (loading || !contentReady) {
    return (
      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading test…
        </div>
      </div>
    );
  }

  function normalizeAnswerKeyForSave(key: AnswerKeyMap): AnswerKeyMap {
    const next: AnswerKeyMap = {};
    for (const [questionKey, value] of Object.entries(key)) {
      next[questionKey] = normalizeTextAlternativesForSave(value);
    }
    return next;
  }

  async function handleSave(): Promise<boolean> {
    if (!testId) return false;
    if (isLocked) {
      toast("Test is locked", {
        description:
          "Published tests cannot be edited. Duplicate this test from the table to make changes.",
        variant: "warning",
      });
      return false;
    }

    setSaving(true);
    try {
      await updateTest(testId, {
        title: title.trim(),
        content,
        answerKey: showAnswerKey ? normalizeAnswerKeyForSave(answerKey) : undefined,
        durationMin,
      });
      toast("Draft saved", { variant: "success" });
      return true;
    } catch (err) {
      if (handleContentError(err, "Save")) return false;
      toast("Save failed", {
        description: getErrorMessage(err, "Save failed"),
        variant: "error",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!testId) return;
    if (!isPublishReady(module, content, answerKey, mediaAssets)) {
      toast("Not ready to publish", {
        description: "Complete all checklist items before publishing.",
        variant: "warning",
      });
      return;
    }
    const saved = await handleSave();
    if (!saved) return;
    setPublishing(true);
    try {
      await publishTest(testId);
      setStatus("published");
      toast("Test published", {
        description: "This test can now be linked to packages.",
        variant: "success",
      });
    } catch (err) {
      if (handleContentError(err, "Publish")) return;
      toast("Publish failed", {
        description: getErrorMessage(err, "Publish failed"),
        variant: "error",
      });
    } finally {
      setPublishing(false);
    }
  }

  async function handleSubmitReview() {
    if (!testId) return;
    const saved = await handleSave();
    if (!saved) return;
    setReviewing(true);
    try {
      await submitForReview(testId);
      setStatus("under_review");
      toast("Submitted for review", { variant: "success" });
    } catch (err) {
      if (handleContentError(err, "Submit")) return;
      toast("Submit failed", {
        description: getErrorMessage(err, "Submit failed"),
        variant: "error",
      });
    } finally {
      setReviewing(false);
    }
  }

  async function handleRevertDraft() {
    if (!testId) return;
    setReviewing(true);
    try {
      await revertToDraft(testId);
      setStatus("draft");
      toast("Reverted to draft", { variant: "success" });
    } catch (err) {
      if (handleContentError(err, "Revert")) return;
      toast("Revert failed", {
        description: getErrorMessage(err, "Revert failed"),
        variant: "error",
      });
    } finally {
      setReviewing(false);
    }
  }

  async function handleDelete() {
    if (!testId) return;
    if (
      !window.confirm(
        "Delete this draft permanently? Media files will also be removed.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteTest(testId);
      toast("Test deleted", { variant: "success" });
    } catch (err) {
      toast("Delete failed", {
        description: getErrorMessage(err, "Delete failed"),
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleClonePublished() {
    if (!testId) return;
    setCloningId(true);
    try {
      const cloned = await cloneTest(testId);
      toast("Test duplicated", {
        description: `${cloned.title} is ready to edit.`,
        variant: "success",
      });
    } catch (err) {
      toast("Duplicate failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setCloningId(false);
    }
  }

  async function handleRetireAndDuplicate() {
    if (!testId) return;
    setRetiring(true);
    try {
      const result = await retireAndDuplicate(testId);
      toast(result.archived ? "Test retired" : "Draft copy created", {
        description: result.archived
          ? `${title} was retired. Edit and publish ${result.cloneTitle}, then assign it in your package.`
          : result.activePackageLinks > 0
            ? `Edit and publish ${result.cloneTitle}, update ${result.activePackageLinks} active package(s), then retire the original.`
            : `Edit and publish ${result.cloneTitle}, then assign it in your package.`,
        variant: "success",
      });
    } catch (err) {
      toast("Retire failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setRetiring(false);
    }
  }

  const tabs: { id: EditorTab; label: string }[] = [
    { id: "visual", label: "Visual editor" },
    { id: "preview", label: "Preview" },
  ];
  const visualLayout = focused ? "flow" : "pane";

  const metaFields = (
    <>
      {isLocked && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          This test is{" "}
          <span className="font-semibold">{status.replace("_", " ")}</span> and
          locked to protect exam integrity.
          {status === "published"
            ? " Use Retire & duplicate to create an editable draft copy."
            : " Use Clone in the tests table to create an editable copy."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLocked}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-duration">Duration (min)</Label>
          <Input
            id="edit-duration"
            type="number"
            min={1}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            disabled={isLocked}
          />
        </div>
      </div>

      <PublishChecklist
        module={module}
        content={content}
        answerKey={answerKey}
        mediaAssets={mediaAssets}
        published={status === "published"}
      />

      <div className="flex flex-wrap gap-1 border-b border-border pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-semibold transition",
              tab === t.id
                ? "border border-b-white border-border bg-white text-navy -mb-px"
                : "text-muted hover:text-navy",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </>
  );

  const tabPanel = (
    <>
      {tab === "visual" && (
        <div
          className={cn(
            focused ? undefined : "flex h-full min-h-0 flex-col",
            isLocked && "pointer-events-none opacity-75",
          )}
          aria-disabled={isLocked || undefined}
        >
          {module === "reading" && (
            <ReadingVisualEditor
              testId={testId}
              content={content as ReadingContent}
              answerKey={answerKey}
              layout={visualLayout}
              onContentChange={(c) => handleContentChange(c)}
              onAnswerKeyChange={handleAnswerKeyChange}
            />
          )}
          {module === "listening" && (
            <ListeningVisualEditor
              testId={testId ?? undefined}
              content={content as ListeningContent}
              answerKey={answerKey}
              layout={visualLayout}
              onContentChange={(c) => handleContentChange(c)}
              onAnswerKeyChange={handleAnswerKeyChange}
              onMediaUpdated={refreshMediaAssets}
            />
          )}
          {module === "writing" && (
            <WritingVisualEditor
              testId={testId ?? undefined}
              content={content as WritingContent}
              layout={visualLayout}
              onContentChange={(c) => handleContentChange(c)}
              onMediaUpdated={refreshMediaAssets}
            />
          )}
          {module === "speaking" && (
            <SpeakingVisualEditor
              content={content as SpeakingContent}
              layout={visualLayout}
              onContentChange={(c) => handleContentChange(c)}
            />
          )}
        </div>
      )}

      {tab === "preview" && (
        <div className={cn(focused ? undefined : "h-full min-h-0 overflow-y-auto")}>
          <ContentPreviewPanel
            module={module}
            content={content}
            mediaAssets={mediaAssets}
          />
        </div>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm",
        focused ? "min-h-0 flex-1" : "max-h-[calc(100dvh-9rem)]",
      )}
    >
      <div className="flex shrink-0 flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h2 className="font-semibold capitalize text-navy">{module} editor</h2>
          <p className="mt-0.5 font-mono text-xs text-muted">{code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "published" && features.retireAndDuplicate && (
            <Button
              variant="secondary"
              size="sm"
              loading={retiring}
              onClick={() => void handleRetireAndDuplicate()}
            >
              Retire &amp; duplicate
            </Button>
          )}
          {status === "published" && !features.retireAndDuplicate && (
            <Button
              variant="secondary"
              size="sm"
              loading={cloningId}
              onClick={() => void handleClonePublished()}
            >
              Duplicate
            </Button>
          )}
          {!isLocked && (
            <>
              <Button
                variant="secondary"
                size="sm"
                loading={saving}
                onClick={() => void handleSave()}
              >
                Save draft
              </Button>
              {status === "draft" && features.submitForReview && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={reviewing}
                  onClick={() => void handleSubmitReview()}
                >
                  Submit for review
                </Button>
              )}
              {status === "under_review" && features.revertToDraft && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={reviewing}
                  onClick={() => void handleRevertDraft()}
                >
                  Back to draft
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                loading={publishing}
                onClick={() => void handlePublish()}
              >
                Publish
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={deleting}
                onClick={() => void handleDelete()}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {focused ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-5 pb-4 sm:p-6 sm:pb-4">{metaFields}</div>
          <div className="px-5 pb-6 sm:px-6 sm:pb-8">{tabPanel}</div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 space-y-5 p-5 pb-4 sm:p-6 sm:pb-4">{metaFields}</div>
          <div className="min-h-0 flex-1 overflow-hidden px-5 pb-6 sm:px-6 sm:pb-8">
            {tabPanel}
          </div>
        </div>
      )}
    </div>
  );
}
