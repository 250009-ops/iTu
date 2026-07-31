"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  analyzeWritingSession,
  createWritingSession,
  getWritingPrompts,
  getWritingSession,
  updateWritingSession,
  type WritingPracticeSession,
  type WritingSections,
} from "@/lib/api/practice";
import { AI_FEATURES_ENABLED } from "@/lib/ai/feature-flags";

type Props = {
  basePath: string;
  sessionId?: string;
};

export function WritingCoachView({ basePath, sessionId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<
    Awaited<ReturnType<typeof getWritingPrompts>>
  >([]);
  const [session, setSession] = useState<WritingPracticeSession | null>(null);
  const [sections, setSections] = useState<WritingSections>({
    introduction: "",
    bodyParagraphs: [""],
    conclusion: "",
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!AI_FEATURES_ENABLED) {
      setLoading(false);
      return;
    }
    void getWritingPrompts()
      .then(setPrompts)
      .catch(() => setError("Failed to load prompts"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!AI_FEATURES_ENABLED || !sessionId) return;
    void getWritingSession(sessionId)
      .then((s) => {
        setSession(s);
        setSections(s.sections);
      })
      .catch(() => setError("Session not found"));
  }, [sessionId]);

  if (!AI_FEATURES_ENABLED) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-8">
        <Link href={basePath} className="text-sm text-muted hover:text-navy">
          ← Back to Practice Hub
        </Link>
        <h1 className="text-2xl font-bold text-navy">Writing practice</h1>
        <p className="text-sm text-muted">
          This practice area is not available right now. Continue with Reading and
          Listening drills from the Practice Hub.
        </p>
      </div>
    );
  }

  async function startWithPrompt(promptId: string) {
    const s = await createWritingSession(promptId);
    window.location.href = `${basePath}/writing/${s.id}`;
  }

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    try {
      const updated = await updateWritingSession(session.id, sections);
      setSession(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze() {
    if (!session) return;
    setAnalyzing(true);
    try {
      await handleSave();
      const updated = await analyzeWritingSession(session.id);
      setSession(updated);
      setSections(updated.sections);
    } finally {
      setAnalyzing(false);
    }
  }

  function updateBody(index: number, value: string) {
    setSections((prev) => {
      const bodyParagraphs = [...prev.bodyParagraphs];
      bodyParagraphs[index] = value;
      return { ...prev, bodyParagraphs };
    });
  }

  if (!sessionId) {
    return (
      <ApiDataShell loading={loading} error={error}>
        <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
          <Link href={basePath} className="text-sm text-muted hover:text-navy">
            ← Back to Practice Hub
          </Link>
          <h1 className="text-2xl font-bold text-navy">AI Writing Coach</h1>
          <p className="text-sm text-muted">
            Choose a prompt, write by section, then get QuillBot-style improvements (1 credit per essay).
          </p>
          <div className="grid gap-3">
            {prompts.map((p) => (
              <button
                key={p.id}
                type="button"
                className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-navy"
                onClick={() => void startWithPrompt(p.id)}
              >
                <p className="font-medium text-navy">{p.title}</p>
                <p className="mt-1 text-xs text-muted">
                  Task {p.taskNumber} · min {p.minWords} words
                </p>
              </button>
            ))}
          </div>
        </div>
      </ApiDataShell>
    );
  }

  return (
    <ApiDataShell loading={loading && !session} error={error}>
      <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-8">
        <Link href={`${basePath}/writing`} className="text-sm text-muted hover:text-navy">
          ← Choose another prompt
        </Link>
        {session?.prompt && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h1 className="font-semibold text-navy">{session.prompt.title}</h1>
            <p className="mt-2 text-sm text-muted">{session.prompt.instruction}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="font-semibold text-navy">Your essay</h2>
            <SectionEditor
              label="Introduction"
              value={sections.introduction}
              onChange={(v) => setSections({ ...sections, introduction: v })}
            />
            {sections.bodyParagraphs.map((para, i) => (
              <div key={i} className="relative">
                <SectionEditor
                  label={`Body paragraph ${i + 1}`}
                  value={para}
                  onChange={(v) => updateBody(i, v)}
                />
                {sections.bodyParagraphs.length > 1 && (
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-muted hover:text-red-600"
                    onClick={() =>
                      setSections({
                        ...sections,
                        bodyParagraphs: sections.bodyParagraphs.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setSections({
                  ...sections,
                  bodyParagraphs: [...sections.bodyParagraphs, ""],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add body paragraph
            </Button>
            <SectionEditor
              label="Conclusion"
              value={sections.conclusion}
              onChange={(v) => setSections({ ...sections, conclusion: v })}
            />
            <div className="flex gap-2">
              <Button variant="secondary" disabled={saving} onClick={() => void handleSave()}>
                Save draft
              </Button>
              <Button
                variant="primary"
                disabled={analyzing || session?.status === "ready"}
                onClick={() => void handleAnalyze()}
              >
                <Sparkles className="h-4 w-4" />
                Get AI feedback (1 credit)
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-navy">AI improved version</h2>
            {session?.aiFeedback ? (
              <>
                <p className="text-sm text-muted">{session.aiFeedback.summary}</p>
                <SectionEditor
                  label="Introduction"
                  value={session.aiFeedback.improvedSections.introduction}
                  onChange={() => undefined}
                  readOnly
                />
                {session.aiFeedback.improvedSections.bodyParagraphs.map((para, i) => (
                  <SectionEditor
                    key={i}
                    label={`Body ${i + 1}`}
                    value={para}
                    onChange={() => undefined}
                    readOnly
                  />
                ))}
                <SectionEditor
                  label="Conclusion"
                  value={session.aiFeedback.improvedSections.conclusion}
                  onChange={() => undefined}
                  readOnly
                />
                {session.aiFeedback.annotations.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                    <p className="mb-2 font-medium text-navy">Suggestions</p>
                    <ul className="space-y-2">
                      {session.aiFeedback.annotations.slice(0, 12).map((a, i) => (
                        <li key={i}>
                          <span className="text-red-700 line-through">{a.original}</span>
                          {" → "}
                          <span className="text-green-700">{a.suggestion}</span>
                          {a.explanation && (
                            <span className="block text-xs text-muted">{a.explanation}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-muted">
                {session?.status === "analyzing"
                  ? "Analyzing your essay…"
                  : "Submit for AI feedback to see improvements here."}
              </div>
            )}
          </div>
        </div>
      </div>
    </ApiDataShell>
  );
}

function SectionEditor({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        className="mt-1 min-h-[100px] w-full rounded-lg border border-slate-200 p-3 text-sm"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
