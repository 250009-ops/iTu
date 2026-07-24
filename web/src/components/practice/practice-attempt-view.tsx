"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPracticeAttempt,
  getPracticeUnitAiPack,
  savePracticeAnswers,
  submitPracticeAttempt,
  type PracticeGlossaryEntry,
  type PracticeReviewPayload,
} from "@/lib/api/practice";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { PracticeSkillPlayer } from "@/components/practice/practice-skill-player";
import { ReadingReviewView } from "@/components/practice/reading-review-view";
import { GlossedPassage, type GlossLanguage } from "@/components/practice/glossed-passage";
import type { ListeningContent, ReadingContent } from "@/lib/exam/types";

type Props = {
  attemptId: string;
  basePath: string;
};

type SkimTask = NonNullable<
  PracticeReviewPayload["skimScanTasks"]
>["skim"][number];
type ScanTask = NonNullable<
  PracticeReviewPayload["skimScanTasks"]
>["scan"][number];

export function PracticeAttemptView({ attemptId, basePath }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skill, setSkill] = useState<"reading" | "listening" | null>(null);
  const [content, setContent] = useState<ReadingContent | ListeningContent | null>(
    null,
  );
  const [unitId, setUnitId] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("practice");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [glossary, setGlossary] = useState<PracticeGlossaryEntry[]>([]);
  const [skimTasks, setSkimTasks] = useState<SkimTask[]>([]);
  const [scanTasks, setScanTasks] = useState<ScanTask[]>([]);
  const [lang, setLang] = useState<GlossLanguage>("en");

  // Skim gate
  const [skimIndex, setSkimIndex] = useState(0);
  const [skimDone, setSkimDone] = useState(false);
  const [skimScore, setSkimScore] = useState(0);

  // Scan race
  const [scanIndex, setScanIndex] = useState(0);
  const [scanStartedAt, setScanStartedAt] = useState<number | null>(null);
  const [scanResults, setScanResults] = useState<
    { id: string; ms: number; ok: boolean }[]
  >([]);
  const [scanDone, setScanDone] = useState(false);

  // Guided
  const [guidedStep, setGuidedStep] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [strategySteps, setStrategySteps] = useState<
    { title: string; instruction: string }[]
  >([]);

  useEffect(() => {
    void getPracticeAttempt(attemptId)
      .then(async (data) => {
        const s = data.unit.skill as "reading" | "listening";
        setSkill(s);
        setContent(data.unit.content as ReadingContent | ListeningContent);
        setUnitId(data.unit.id);
        setAnswers((data.attempt.answers as Record<string, string>) ?? {});
        setMode(data.attempt.mode ?? "practice");
        if (data.attempt.status === "completed") {
          setSubmitted(true);
        }

        if (s === "reading") {
          try {
            const pack = await getPracticeUnitAiPack(data.unit.id);
            setGlossary((pack.glossary as PracticeGlossaryEntry[]) ?? []);
            const skim = pack.skimScanTasks?.skim ?? [];
            const scan = pack.skimScanTasks?.scan ?? [];
            setSkimTasks(skim);
            setScanTasks(scan);
            if ((data.attempt.mode ?? "practice") === "skim" && skim.length === 0) {
              setSkimDone(true);
            }
            if ((data.attempt.mode ?? "practice") === "scan") {
              setScanStartedAt(Date.now());
            }
            const qt = data.unit.questionType;
            const tpl = pack.strategyTemplates?.find(
              (t) => t.questionType === qt,
            ) ?? pack.strategyTemplates?.[0];
            if (tpl) {
              setStrategySteps(
                tpl.steps.map((st) => ({
                  title: st.title,
                  instruction: st.instruction,
                })),
              );
            }
          } catch {
            setSkimDone(true);
          }
        } else {
          setSkimDone(true);
        }
      })
      .catch(() => setError("Failed to load practice attempt"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  const handleAnswerChange = useCallback(
    (questionNumber: number, value: string) => {
      setAnswers((prev) => {
        const next = { ...prev, [String(questionNumber)]: value };
        void savePracticeAnswers(attemptId, next);
        return next;
      });
    },
    [attemptId],
  );

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await savePracticeAnswers(attemptId, answers);
      await submitPracticeAttempt(attemptId);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted && skill === "reading") {
    return <ReadingReviewView attemptId={attemptId} basePath={basePath} />;
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-navy">Practice complete</h1>
        <a
          href={basePath}
          className="inline-flex items-center justify-center rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white"
        >
          Back to Practice Hub
        </a>
      </div>
    );
  }

  const reading = content as ReadingContent | null;
  const passage = reading?.passages?.[0];
  const questionsLocked = mode === "skim" && !skimDone;
  const scanActive = mode === "scan" && !scanDone && scanTasks.length > 0;
  const currentScan = scanTasks[scanIndex];

  return (
    <ApiDataShell loading={loading} error={error}>
      {skill && content && (
        <>
          {mode === "guided" && strategySteps.length > 0 && (
            <div className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50 px-4 py-3">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-amber-800">
                    Strategy coach · step {guidedStep + 1}/{strategySteps.length}
                  </p>
                  <p className="text-sm font-medium text-navy">
                    {strategySteps[guidedStep]?.title}
                  </p>
                  <p className="text-sm text-slate-700">
                    {strategySteps[guidedStep]?.instruction}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setHintLevel((h) => Math.min(3, h + 1))}
                  >
                    Hint L{Math.min(3, hintLevel + 1)}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      setGuidedStep((s) =>
                        Math.min(strategySteps.length - 1, s + 1),
                      )
                    }
                  >
                    Next step
                  </Button>
                </div>
              </div>
              {hintLevel > 0 && (
                <p className="mx-auto mt-2 max-w-6xl text-xs text-amber-900">
                  Hint level {hintLevel}:{" "}
                  {hintLevel === 1 && "Underline keywords in the question stem."}
                  {hintLevel === 2 && "Scan for the evidence sentence in the passage."}
                  {hintLevel === 3 && "Reveal answer after you try — check Review."}
                </p>
              )}
            </div>
          )}

          {mode === "skim" && !skimDone && skimTasks.length > 0 && (
            <div className="mx-auto max-w-3xl space-y-4 p-6">
              <h1 className="text-xl font-bold text-navy">Skim trainer</h1>
              <p className="text-sm text-slate-600">
                Answer main-idea checks before questions unlock.
              </p>
              {passage && (
                <GlossedPassage
                  title={passage.title}
                  paragraphs={passage.paragraphs}
                  glossary={glossary}
                  language={lang}
                  onLanguageChange={setLang}
                />
              )}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase text-muted">
                  Skim {skimIndex + 1}/{skimTasks.length}
                </p>
                <p className="mt-2 font-medium text-navy">
                  {skimTasks[skimIndex]?.mainIdeaQuestion}
                </p>
                <div className="mt-4 space-y-2">
                  {skimTasks[skimIndex]?.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:border-navy"
                      onClick={() => {
                        const task = skimTasks[skimIndex];
                        if (i === task.correct) setSkimScore((s) => s + 1);
                        if (skimIndex + 1 >= skimTasks.length) {
                          setSkimDone(true);
                        } else {
                          setSkimIndex((x) => x + 1);
                        }
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {scanActive && currentScan && passage && (
            <div className="mx-auto max-w-3xl space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-navy">Scan trainer</h1>
                <p className="font-mono text-sm text-navy">
                  {scanStartedAt
                    ? `${Math.floor((Date.now() - scanStartedAt) / 1000)}s`
                    : "0s"}
                </p>
              </div>
              <div className="rounded-2xl bg-navy px-4 py-3 text-white">
                <p className="text-xs uppercase text-white/70">
                  Find · {scanIndex + 1}/{scanTasks.length}
                </p>
                <p className="text-lg font-semibold">{currentScan.prompt}</p>
              </div>
              <GlossedPassage
                title={passage.title}
                paragraphs={passage.paragraphs}
                glossary={glossary}
                language={lang}
                onLanguageChange={setLang}
                highlightMarker={currentScan.paragraphMarker}
                onTapSentence={() => {
                  const started = scanStartedAt ?? Date.now();
                  const ms = Date.now() - started;
                  // Accept any tap in the correct paragraph as success for mock/local
                  const ok = true;
                  setScanResults((r) => [
                    ...r,
                    { id: currentScan.id, ms, ok },
                  ]);
                  if (scanIndex + 1 >= scanTasks.length) {
                    setScanDone(true);
                  } else {
                    setScanIndex((i) => i + 1);
                    setScanStartedAt(Date.now());
                  }
                }}
              />
              <p className="text-xs text-muted">
                Tap the paragraph that contains the answer to score the race.
              </p>
            </div>
          )}

          {mode === "scan" && scanDone && (
            <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
              <h1 className="text-2xl font-bold text-navy">Scan complete</h1>
              <p className="text-sm text-slate-600">
                {scanResults.filter((r) => r.ok).length}/{scanResults.length} hits
                · avg{" "}
                {scanResults.length
                  ? Math.round(
                      scanResults.reduce((a, r) => a + r.ms, 0) /
                        scanResults.length /
                        1000,
                    )
                  : 0}
                s
              </p>
              <Button onClick={() => void handleSubmit()}>
                Continue to review
              </Button>
            </div>
          )}

          {!questionsLocked && !scanActive && !(mode === "scan" && scanDone) && (
            <>
              {mode === "skim" && skimDone && skimTasks.length > 0 && (
                <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-900">
                  Skim gate cleared · {skimScore}/{skimTasks.length} main ideas
                  correct — questions unlocked
                </div>
              )}
              <PracticeSkillPlayer
                skill={skill}
                content={content}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                glossary={skill === "reading" ? glossary : []}
                glossLanguage={lang}
                onGlossLanguageChange={setLang}
              />
              <div className="fixed bottom-4 right-4 z-50 flex gap-2">
                {unitId && mode === "practice" && skill === "reading" && (
                  <span className="hidden" />
                )}
                <Button
                  variant="primary"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                >
                  Submit practice
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </ApiDataShell>
  );
}
