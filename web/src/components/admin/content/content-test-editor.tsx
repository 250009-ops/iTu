"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListeningAudioUpload } from "@/components/admin/content/listening-editor";
import { ListeningVisualEditor } from "@/components/admin/content/editors/listening-visual-editor";
import { ReadingVisualEditor } from "@/components/admin/content/editors/reading-visual-editor";
import { SpeakingVisualEditor } from "@/components/admin/content/editors/speaking-visual-editor";
import { WritingVisualEditor } from "@/components/admin/content/editors/writing-visual-editor";
import { ContentPreviewPanel } from "@/components/admin/content/preview/content-preview-panel";
import {
  isPublishReady,
  PublishChecklist,
} from "@/components/admin/content/publish-checklist";
import { moduleUsesAnswerKey } from "@/lib/admin/content-templates";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { syncAnswerKey } from "@/lib/admin/content/utils";
import { normalizeContent } from "@/lib/admin/content/normalize";
import type { ContentModule } from "@/lib/admin/types";
import { useAdminContent } from "@/contexts/admin-content-context";
import { getContentTest } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import type {
  ListeningContent,
  ReadingContent,
  SpeakingContent,
  WritingContent,
} from "@/lib/exam/types";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type EditorTab = "visual" | "preview" | "advanced";

type Props = {
  module: ContentModule;
  testId: string | null;
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function ContentTestEditor({ module, testId }: Props) {
  const { updateTest, publishTest, submitForReview, revertToDraft } = useAdminContent();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [tab, setTab] = useState<EditorTab>("visual");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("draft");
  const [durationMin, setDurationMin] = useState(60);
  const [content, setContent] = useState<object>({});
  const [answerKey, setAnswerKey] = useState<AnswerKeyMap>({});
  const [contentJson, setContentJson] = useState("{}");
  const [answerKeyJson, setAnswerKeyJson] = useState("{}");
  const [mediaCount, setMediaCount] = useState(0);

  const showAnswerKey = moduleUsesAnswerKey(module);

  useEffect(() => {
    if (!testId) {
      setTitle("");
      setCode("");
      setStatus("draft");
      setContent({});
      setAnswerKey({});
      setContentJson("{}");
      setAnswerKeyJson("{}");
      setMediaCount(0);
      return;
    }

    let active = true;
    setLoading(true);
    void getContentTest(testId)
      .then((test) => {
        if (!active) return;
        setTitle(test.title);
        setCode(test.code);
        setStatus(test.status);
        setDurationMin(test.durationMin ?? 60);
        const c = normalizeContent(module, (test.content ?? {}) as object);
        const k = (test.answerKey ?? {}) as AnswerKeyMap;
        const syncedKey = moduleUsesAnswerKey(module)
          ? syncAnswerKey(module, c, k)
          : k;
        setContent(c);
        setAnswerKey(syncedKey);
        setContentJson(formatJson(c));
        setAnswerKeyJson(formatJson(syncedKey));
        setMediaCount(test.mediaAssets?.length ?? 0);
      })
      .catch((err) => {
        if (!active) return;
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

  function handleContentChange(next: object) {
    setContent(next);
    setContentJson(formatJson(next));
    if (showAnswerKey) {
      setAnswerKey((prev) => {
        const synced = syncAnswerKey(module, next, prev);
        setAnswerKeyJson(formatJson(synced));
        return synced;
      });
    }
  }

  function handleAnswerKeyChange(next: AnswerKeyMap) {
    setAnswerKey(next);
    setAnswerKeyJson(formatJson(next));
  }

  function refreshMediaCount() {
    if (!testId) return;
    void getContentTest(testId).then((test) => {
      setMediaCount(test.mediaAssets?.length ?? 0);
    });
  }

  if (!testId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-50 px-5 py-10 text-center text-sm text-muted">
        Select a test from the table above, or create a new draft.
      </div>
    );
  }

  async function handleSave(): Promise<boolean> {
    if (!testId) return false;
    let payloadContent: object;
    let payloadAnswerKey: object | undefined;

    if (tab === "advanced") {
      try {
        payloadContent = JSON.parse(contentJson) as object;
        if (showAnswerKey) {
          payloadAnswerKey = JSON.parse(answerKeyJson) as object;
        }
      } catch {
        toast("Invalid JSON", {
          description: "Fix syntax errors in the content or answer key editor.",
          variant: "error",
        });
        return false;
      }
    } else {
      payloadContent = content;
      payloadAnswerKey = showAnswerKey ? answerKey : undefined;
    }

    setSaving(true);
    try {
      await updateTest(testId, {
        title: title.trim(),
        content: payloadContent,
        answerKey: payloadAnswerKey,
        durationMin,
      });
      setContent(payloadContent);
      if (payloadAnswerKey) {
        setAnswerKey(payloadAnswerKey as AnswerKeyMap);
      }
      toast("Draft saved", { variant: "success" });
      return true;
    } catch (err) {
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
    if (!isPublishReady(module, content, answerKey, mediaCount)) {
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
      toast("Revert failed", {
        description: getErrorMessage(err, "Revert failed"),
        variant: "error",
      });
    } finally {
      setReviewing(false);
    }
  }

  const tabs: { id: EditorTab; label: string }[] = [
    { id: "visual", label: "Visual editor" },
    { id: "preview", label: "Preview" },
    { id: "advanced", label: "Advanced JSON" },
  ];

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h2 className="font-semibold capitalize text-navy">{module} editor</h2>
          <p className="mt-0.5 font-mono text-xs text-muted">{code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" loading={saving} onClick={() => void handleSave()}>
            Save draft
          </Button>
          {status === "draft" && (
            <Button
              variant="secondary"
              size="sm"
              loading={reviewing}
              onClick={() => void handleSubmitReview()}
            >
              Submit for review
            </Button>
          )}
          {status === "under_review" && (
            <Button
              variant="secondary"
              size="sm"
              loading={reviewing}
              onClick={() => void handleRevertDraft()}
            >
              Back to draft
            </Button>
          )}
          {status !== "published" && (
            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              loading={publishing}
              onClick={() => void handlePublish()}
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading test…
        </div>
      ) : (
        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
              />
            </div>
          </div>

          <PublishChecklist
            module={module}
            content={content}
            answerKey={answerKey}
            mediaCount={mediaCount}
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

          {tab === "visual" && (
            <div className="space-y-5">
              {module === "listening" && testId && (
                <ListeningAudioUpload
                  testId={testId}
                  onMediaUpdated={refreshMediaCount}
                />
              )}
              {module === "reading" && (
                <ReadingVisualEditor
                  testId={testId}
                  content={content as ReadingContent}
                  answerKey={answerKey}
                  onContentChange={(c) => handleContentChange(c)}
                  onAnswerKeyChange={handleAnswerKeyChange}
                />
              )}
              {module === "listening" && (
                <ListeningVisualEditor
                  testId={testId}
                  content={content as ListeningContent}
                  answerKey={answerKey}
                  onContentChange={(c) => handleContentChange(c)}
                  onAnswerKeyChange={handleAnswerKeyChange}
                />
              )}
              {module === "writing" && (
                <WritingVisualEditor
                  content={content as WritingContent}
                  onContentChange={(c) => handleContentChange(c)}
                />
              )}
              {module === "speaking" && (
                <SpeakingVisualEditor
                  content={content as SpeakingContent}
                  onContentChange={(c) => handleContentChange(c)}
                />
              )}
            </div>
          )}

          {tab === "preview" && (
            <ContentPreviewPanel module={module} content={content} />
          )}

          {tab === "advanced" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="edit-content">Content JSON</Label>
                <textarea
                  id="edit-content"
                  value={contentJson}
                  onChange={(e) => setContentJson(e.target.value)}
                  spellCheck={false}
                  className="min-h-[280px] w-full rounded-lg border border-border bg-slate-50 p-3 font-mono text-xs leading-relaxed text-navy focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
                />
              </div>
              {showAnswerKey && (
                <div className="space-y-2">
                  <Label htmlFor="edit-answer-key">Answer key JSON</Label>
                  <textarea
                    id="edit-answer-key"
                    value={answerKeyJson}
                    onChange={(e) => setAnswerKeyJson(e.target.value)}
                    spellCheck={false}
                    className="min-h-[160px] w-full rounded-lg border border-border bg-slate-50 p-3 font-mono text-xs leading-relaxed text-navy focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
