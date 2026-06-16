"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { moduleUsesAnswerKey } from "@/lib/admin/content-templates";
import type { ContentModule } from "@/lib/admin/types";
import { useAdminContent } from "@/contexts/admin-content-context";
import { getContentTest } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";

type Props = {
  module: ContentModule;
  testId: string | null;
  children?: ReactNode;
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function ContentTestEditor({ module, testId, children }: Props) {
  const { updateTest, publishTest } = useAdminContent();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("draft");
  const [durationMin, setDurationMin] = useState(60);
  const [contentJson, setContentJson] = useState("{}");
  const [answerKeyJson, setAnswerKeyJson] = useState("{}");

  const showAnswerKey = moduleUsesAnswerKey(module);

  useEffect(() => {
    if (!testId) {
      setTitle("");
      setCode("");
      setStatus("draft");
      setContentJson("{}");
      setAnswerKeyJson("{}");
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
        setContentJson(formatJson(test.content ?? {}));
        setAnswerKeyJson(formatJson(test.answerKey ?? {}));
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
  }, [testId, toast]);

  if (!testId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-50 px-5 py-10 text-center text-sm text-muted">
        Select a test from the table above, or create a new draft.
      </div>
    );
  }

  async function handleSave() {
    if (!testId) return;
    let content: object;
    let answerKey: object | undefined;

    try {
      content = JSON.parse(contentJson) as object;
      if (showAnswerKey) {
        answerKey = JSON.parse(answerKeyJson) as object;
      }
    } catch {
      toast("Invalid JSON", {
        description: "Fix syntax errors in the content or answer key editor.",
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      await updateTest(testId, {
        title: title.trim(),
        content,
        answerKey,
        durationMin,
      });
      toast("Draft saved", { variant: "success" });
    } catch (err) {
      toast("Save failed", {
        description: getErrorMessage(err, "Save failed"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!testId) return;
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

          {children}

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
  );
}
