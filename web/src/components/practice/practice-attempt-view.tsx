"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookX,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  Send,
  Target,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import {
  getPracticeAttempt,
  getPracticeUnitAiPack,
  normalizePracticeGlossary,
  savePracticeAnswers,
  submitPracticeAttempt,
  type PracticeGlossaryEntry,
  type PracticeReviewPayload,
} from "@/lib/api/practice";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PracticeSkillPlayer } from "@/components/practice/practice-skill-player";
import { ReadingReviewView } from "@/components/practice/reading-review-view";
import {
  AnsweredPill,
  LangToggle,
  practiceModeMeta,
  PracticeBanner,
  PracticeResultCard,
  PracticeScreen,
  PracticeSplit,
  PracticeTopBar,
  TimerPill,
} from "@/components/practice/practice-chrome";
import { GlossedPassage, type GlossLanguage } from "@/components/practice/glossed-passage";
import type { ListeningContent, ReadingContent } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Props = {
  attemptId: string;
  basePath: string;
};

type SkimTask = NonNullable<PracticeReviewPayload["skimScanTasks"]>["skim"][number];
type ScanTask = NonNullable<PracticeReviewPayload["skimScanTasks"]>["scan"][number];
type StrategyTemplate = PracticeReviewPayload["strategyTemplates"][number];

/** Presentational phase ladder mapped onto the template's strategy steps. */
function phaseFor(index: number, total: number) {
  if (total <= 1 || index === 0) {
    return { label: "I do", className: "border-blue-200 bg-blue-50 text-blue-700" };
  }
  if (index === total - 1) {
    return {
      label: "You do",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  return { label: "We do", className: "border-amber-200 bg-amber-50 text-amber-700" };
}

export function PracticeAttemptView({ attemptId, basePath }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skill, setSkill] = useState<"reading" | "listening" | null>(null);
  const [content, setContent] = useState<ReadingContent | ListeningContent | null>(
    null,
  );
  const [unitTitle, setUnitTitle] = useState<string>("Practice");
  const [mode, setMode] = useState<string>("practice");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [glossary, setGlossary] = useState<PracticeGlossaryEntry[]>([]);
  const [skimTasks, setSkimTasks] = useState<SkimTask[]>([]);
  const [scanTasks, setScanTasks] = useState<ScanTask[]>([]);
  const [lang, setLang] = useState<GlossLanguage>("en");
  const [aiPackMissing, setAiPackMissing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Skim gate
  const [skimIndex, setSkimIndex] = useState(0);
  const [skimDone, setSkimDone] = useState(false);
  const [skimAcknowledged, setSkimAcknowledged] = useState(false);
  const [skimSelected, setSkimSelected] = useState<number | null>(null);
  const [skimChecked, setSkimChecked] = useState(false);
  const [skimResults, setSkimResults] = useState<boolean[]>([]);

  // Scan race
  const [scanIndex, setScanIndex] = useState(0);
  const [scanStartedAt, setScanStartedAt] = useState<number | null>(null);
  const [scanElapsed, setScanElapsed] = useState(0);
  const [scanTapped, setScanTapped] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<
    { id: string; seconds: number; ok: boolean }[]
  >([]);
  const [scanDone, setScanDone] = useState(false);

  // Guided coach
  const [guidedStep, setGuidedStep] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [strategy, setStrategy] = useState<StrategyTemplate | null>(null);

  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      timeouts.current.forEach(clearTimeout);
    },
    [],
  );
  const defer = useCallback((fn: () => void, ms: number) => {
    timeouts.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getPracticeAttempt(attemptId)
      .then(async (data) => {
        if (cancelled) return;
        setError(null);
        const s = data.unit.skill as "reading" | "listening";
        const nextMode = data.attempt.mode ?? "practice";
        setSkill(s);
        setContent(data.unit.content as ReadingContent | ListeningContent);
        setUnitTitle(data.unit.title || "Practice");
        setAnswers((data.attempt.answers as Record<string, string>) ?? {});
        setMode(nextMode);
        if (data.unit.durationMin > 0) {
          setSecondsLeft(data.unit.durationMin * 60);
        }
        if (data.attempt.status === "completed") {
          setSubmitted(true);
        }

        if (s === "reading") {
          try {
            const pack = await getPracticeUnitAiPack(data.unit.id);
            if (cancelled) return;
            setGlossary(normalizePracticeGlossary(pack.glossary));
            // Accept only fully-shaped trainer items (legacy packs used {prompt,hint}).
            const skim = (pack.skimScanTasks?.skim ?? []).filter(
              (t): t is SkimTask =>
                Boolean(
                  t &&
                    typeof t.mainIdeaQuestion === "string" &&
                    Array.isArray(t.options) &&
                    t.options.length > 0,
                ),
            );
            const scan = (pack.skimScanTasks?.scan ?? []).filter(
              (t): t is ScanTask =>
                Boolean(
                  t &&
                    typeof t.id === "string" &&
                    typeof t.prompt === "string" &&
                    t.prompt.length > 0,
                ),
            );
            setSkimTasks(skim);
            setScanTasks(scan);
            // Missing/legacy trainer packs must not blank the player.
            if (nextMode === "skim" && skim.length === 0) {
              setSkimDone(true);
              setSkimAcknowledged(true);
              setAiPackMissing(true);
            }
            if (nextMode === "scan") {
              if (scan.length === 0) {
                setScanDone(true);
                setAiPackMissing(true);
              } else {
                setScanStartedAt(Date.now());
              }
            }
            const qt = data.unit.questionType;
            const tpl =
              pack.strategyTemplates?.find((t) => t.questionType === qt) ??
              pack.strategyTemplates?.[0];
            if (tpl) {
              setStrategy(tpl);
            } else if (nextMode === "guided") {
              setAiPackMissing(true);
            }
          } catch {
            if (cancelled) return;
            setAiPackMissing(true);
            setSkimDone(true);
            setSkimAcknowledged(true);
            if (nextMode === "scan") setScanDone(true);
          }
        } else {
          setSkimDone(true);
          setSkimAcknowledged(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load practice attempt");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const scanActive = mode === "scan" && !scanDone && scanTasks.length > 0;
  const countdownRunning = !submitted && !scanActive && secondsLeft != null;

  // Attempt countdown (display only — practice never auto-submits).
  useEffect(() => {
    if (!countdownRunning) return;
    const id = setInterval(
      () => setSecondsLeft((s) => (s == null ? s : Math.max(0, s - 1))),
      1000,
    );
    return () => clearInterval(id);
  }, [countdownRunning]);

  // Per-task stopwatch for the scan race.
  useEffect(() => {
    if (!scanActive || scanStartedAt == null || scanTapped) return;
    const id = setInterval(
      () => setScanElapsed(Math.round((Date.now() - scanStartedAt) / 1000)),
      500,
    );
    return () => clearInterval(id);
  }, [scanActive, scanStartedAt, scanTapped]);

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

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await savePracticeAnswers(attemptId, answers);
      await submitPracticeAttempt(attemptId);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, answers]);

  const answeredCount = useMemo(
    () =>
      Object.values(answers).filter(
        (v) => v != null && String(v).trim().length > 0,
      ).length,
    [answers],
  );
  const totalQuestions = content?.totalQuestions ?? 0;

  if (submitted && skill === "reading") {
    return <ReadingReviewView attemptId={attemptId} basePath={basePath} />;
  }

  if (submitted) {
    return (
      <PracticeScreen>
        <PracticeResultCard
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-600"
          title="Practice complete"
          description="Your answers were submitted. Return to the hub to start another unit."
          footer={
            <Link
              href={basePath}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light"
            >
              Back to Practice Hub
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </PracticeScreen>
    );
  }

  const modeMeta = practiceModeMeta(mode);
  const reading = content as ReadingContent | null;
  const passage = reading?.passages?.[0];
  const paragraphs = passage?.paragraphs ?? [];

  const skimGateOpen = mode === "skim" && !skimDone && skimTasks.length > 0;
  const skimSummaryOpen =
    mode === "skim" && skimDone && !skimAcknowledged && skimTasks.length > 0;
  const scanSummaryOpen = mode === "scan" && scanDone && scanTasks.length > 0;
  const showPlayer =
    Boolean(skill && content) &&
    !skimGateOpen &&
    !skimSummaryOpen &&
    !scanActive &&
    !scanSummaryOpen;

  const currentSkim = skimTasks[skimIndex];
  const currentScan = scanTasks[scanIndex];
  const strategySteps = strategy?.steps ?? [];
  const currentStrategyStep = strategySteps[guidedStep];
  const hintLadder = strategy?.hintLadder ?? [];

  function commitSkimAnswer() {
    if (skimSelected == null || !currentSkim) return;
    const correct = skimSelected === currentSkim.correct;
    setSkimChecked(true);
    defer(() => {
      setSkimResults((prev) => [...prev, correct]);
      setSkimChecked(false);
      setSkimSelected(null);
      if (skimIndex + 1 >= skimTasks.length) {
        setSkimDone(true);
      } else {
        setSkimIndex((i) => i + 1);
      }
    }, 1100);
  }

  function commitScanTap(marker: string | null) {
    if (!currentScan || scanTapped) return;
    const expected = currentScan.paragraphMarker;
    const ok =
      expected == null ||
      (marker ?? "").toUpperCase() === expected.toUpperCase();
    const seconds = scanStartedAt
      ? Math.max(0, Math.round((Date.now() - scanStartedAt) / 1000))
      : 0;
    setScanTapped(marker);
    setScanResults((prev) => [...prev, { id: currentScan.id, seconds, ok }]);
    defer(() => {
      if (scanIndex + 1 >= scanTasks.length) {
        setScanDone(true);
      } else {
        setScanIndex((i) => i + 1);
        setScanStartedAt(Date.now());
        setScanElapsed(0);
        setScanTapped(null);
      }
    }, 1000);
  }

  const submitBar = (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 lg:px-6">
      <p className="text-xs text-slate-400">
        {totalQuestions > 0
          ? `${Math.max(0, totalQuestions - answeredCount)} unanswered question${
              totalQuestions - answeredCount === 1 ? "" : "s"
            }`
          : `${answeredCount} answered`}
      </p>
      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleSubmit()}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand-red px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-red-hover disabled:opacity-60"
      >
        <Send className="h-3.5 w-3.5" />
        {submitting ? "Submitting…" : "Submit practice"}
      </button>
    </div>
  );

  return (
    <ApiDataShell loading={loading} error={error}>
      {!skill || !content ? (
        <PracticeScreen>
          <PracticeResultCard
            icon={BookX}
            title="Nothing to show"
            description="This practice attempt has no playable content. Try starting again from the hub."
            footer={
              <Link
                href={basePath}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light"
              >
                Back to Practice Hub
              </Link>
            }
          />
        </PracticeScreen>
      ) : (
        <PracticeScreen>
          <PracticeTopBar
            exitHref={basePath}
            modeLabel={modeMeta.label}
            modeChipClassName={modeMeta.chip}
            title={unitTitle}
            subtitle={skill === "reading" ? "IELTS Reading" : "IELTS Listening"}
          >
            {skimGateOpen && currentSkim ? (
              <>
                <span className="text-xs text-muted">
                  Para. {currentSkim.paragraphMarker ?? "—"}
                </span>
                <span className="text-xs font-bold text-navy">
                  {skimIndex + 1}/{skimTasks.length}
                </span>
                <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 sm:block">
                  <span
                    className="block h-full rounded-full bg-emerald-600 transition-all"
                    style={{
                      width: `${(skimIndex / skimTasks.length) * 100}%`,
                    }}
                  />
                </span>
              </>
            ) : scanActive ? (
              <>
                <span className="text-[13px] font-bold tabular-nums text-amber-700">
                  {scanElapsed}s
                </span>
                <span className="text-xs text-muted">
                  {scanIndex + 1}/{scanTasks.length}
                </span>
              </>
            ) : (
              <>
                {showPlayer && totalQuestions > 0 && (
                  <AnsweredPill answered={answeredCount} total={totalQuestions} />
                )}
                {showPlayer && secondsLeft != null && (
                  <TimerPill seconds={secondsLeft} />
                )}
              </>
            )}
            {skill === "reading" && (
              <LangToggle value={lang} onChange={setLang} />
            )}
          </PracticeTopBar>

          {aiPackMissing && (
            <PracticeBanner
              icon={AlertTriangle}
              className="border-amber-200 bg-amber-50 text-amber-900"
            >
              AI trainer pack unavailable — continuing with the standard player.
            </PracticeBanner>
          )}

          {/* ── Skim trainer gate ─────────────────────────────────────── */}
          {skimGateOpen && currentSkim && (
            <>
              <PracticeBanner icon={Zap} className={modeMeta.banner}>
                Answer each paragraph&apos;s main-idea check to unlock the full
                question set.
              </PracticeBanner>
              <PracticeSplit
                leftLabel="Passage"
                rightLabel="Main-idea check"
                leftWidthClassName="lg:w-[55%]"
                left={
                  paragraphs.length > 0 ? (
                    <GlossedPassage
                      variant="bare"
                      title={passage?.title}
                      paragraphs={paragraphs}
                      glossary={glossary}
                      language={lang}
                      highlightMarker={currentSkim.paragraphMarker}
                    />
                  ) : (
                    <p className="text-sm text-muted">
                      Passage unavailable for this unit.
                    </p>
                  )
                }
                right={
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 lg:p-6">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="px-5 pb-3 pt-5">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            Paragraph {currentSkim.paragraphMarker ?? "—"}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Check {skimIndex + 1} of {skimTasks.length}
                          </span>
                        </div>
                        <p className="text-sm font-semibold leading-relaxed text-navy">
                          {currentSkim.mainIdeaQuestion}
                        </p>
                      </div>
                      <div className="space-y-2 px-5 pb-5">
                        {currentSkim.options.map((opt, i) => {
                          const isSelected = skimSelected === i;
                          const isCorrect =
                            skimChecked && i === currentSkim.correct;
                          const isWrong =
                            skimChecked && isSelected && i !== currentSkim.correct;
                          return (
                            <button
                              key={i}
                              type="button"
                              disabled={skimChecked}
                              onClick={() => setSkimSelected(i)}
                              className={cn(
                                "flex w-full items-start gap-2.5 rounded-xl border px-4 py-3 text-left text-[13px] transition-colors",
                                isCorrect
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : isWrong
                                    ? "border-rose-200 bg-rose-50 text-brand-red"
                                    : isSelected
                                      ? "border-navy bg-navy font-medium text-white"
                                      : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-navy/40 hover:bg-white",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                                  isCorrect
                                    ? "bg-emerald-500 text-white"
                                    : isWrong
                                      ? "bg-rose-400 text-white"
                                      : isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-slate-200 text-slate-600",
                                )}
                              >
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="min-w-0">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                      {!skimChecked && (
                        <div className="px-5 pb-5">
                          <button
                            type="button"
                            disabled={skimSelected == null}
                            onClick={commitSkimAnswer}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-navy-light disabled:bg-slate-200 disabled:text-slate-400"
                          >
                            Check answer
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                }
              />
            </>
          )}

          {/* ── Skim gate summary ─────────────────────────────────────── */}
          {skimSummaryOpen && (
            <PracticeResultCard
              icon={Trophy}
              iconClassName={
                skimResults.filter(Boolean).length >= skimTasks.length - 1
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }
              title="Skim check complete"
              description={`${skimResults.filter(Boolean).length}/${skimTasks.length} main ideas identified`}
              footer={
                <button
                  type="button"
                  onClick={() => setSkimAcknowledged(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-navy px-6 py-2.5 text-[13.5px] font-bold text-white hover:bg-navy-light"
                >
                  Continue to questions
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              }
            >
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {skimResults.map((ok, i) => (
                  <span
                    key={i}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border",
                      ok
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-rose-200 bg-rose-50 text-brand-red",
                    )}
                  >
                    {ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                  </span>
                ))}
              </div>
            </PracticeResultCard>
          )}

          {/* ── Scan trainer race ─────────────────────────────────────── */}
          {scanActive && currentScan && (
            <>
              <div className="flex shrink-0 items-center gap-3 bg-navy px-4 py-3 lg:px-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Target className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                    Task {scanIndex + 1} of {scanTasks.length} · tap the paragraph
                    that answers
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">
                    {currentScan.prompt}
                  </p>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
                <div className="mx-auto max-w-3xl">
                  {paragraphs.length > 0 ? (
                    <GlossedPassage
                      variant="bare"
                      paragraphs={paragraphs}
                      glossary={glossary}
                      language={lang}
                      tapMode
                      tappedMarkers={scanTapped ? [scanTapped] : []}
                      onTapSentence={(_quote, marker) => commitScanTap(marker)}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-muted">
                      Passage unavailable for this scan task.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Scan summary ──────────────────────────────────────────── */}
          {scanSummaryOpen && (
            <PracticeResultCard
              wide
              icon={Trophy}
              iconClassName="bg-amber-50 text-amber-600"
              title="Scan complete"
              footer={
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-navy px-6 py-2.5 text-[13.5px] font-bold text-white hover:bg-navy-light disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "View AI review"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              }
            >
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-2xl font-extrabold text-navy">
                    {scanResults.filter((r) => r.ok).length}/{scanTasks.length}
                  </p>
                  <p className="text-xs text-muted">paragraphs found</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-2xl font-extrabold text-navy">
                    {scanResults.length
                      ? Math.round(
                          scanResults.reduce((a, r) => a + r.seconds, 0) /
                            scanResults.length,
                        )
                      : 0}
                    s
                  </p>
                  <p className="text-xs text-muted">avg time per task</p>
                </div>
              </div>
              {scanResults.length > 0 && (
                <div className="mt-4 space-y-2 text-left">
                  {scanResults.map((r, i) => (
                    <div
                      key={`${r.id}-${i}`}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5",
                        r.ok
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-rose-200 bg-rose-50",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {r.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0 text-brand-red" />
                        )}
                        <span className="truncate text-[12.5px] text-slate-700">
                          {scanTasks[i]?.prompt}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold",
                          r.ok ? "text-emerald-700" : "text-brand-red",
                        )}
                      >
                        {r.seconds}s
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </PracticeResultCard>
          )}

          {/* ── Guided coach bar ──────────────────────────────────────── */}
          {showPlayer && mode === "guided" && currentStrategyStep && (
            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3.5 lg:px-5">
              <div className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10.5px] font-bold",
                        phaseFor(guidedStep, strategySteps.length).className,
                      )}
                    >
                      {phaseFor(guidedStep, strategySteps.length).label}
                    </span>
                    <span className="text-[12.5px] font-bold text-amber-900">
                      Step {guidedStep + 1}/{strategySteps.length} —{" "}
                      {currentStrategyStep.title}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-amber-900/90">
                    {currentStrategyStep.instruction}
                  </p>
                  {currentStrategyStep.studentAction && (
                    <p className="mt-2 rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-[12.5px] italic text-amber-900">
                      <strong className="not-italic">Your action:</strong>{" "}
                      {currentStrategyStep.studentAction}
                    </p>
                  )}
                  {hintLevel > 0 && (
                    <div className="mt-2 space-y-1">
                      {hintLadder.slice(0, hintLevel).map((hint, i) => (
                        <p
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-white/70 px-3 py-1.5 text-xs text-amber-900"
                        >
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                          <span>
                            <strong>Hint {i + 1}:</strong> {hint.instruction}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {hintLevel < hintLadder.length && (
                      <button
                        type="button"
                        onClick={() =>
                          setHintLevel((h) => Math.min(hintLadder.length, h + 1))
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200"
                      >
                        <Lightbulb className="h-3 w-3" />
                        Hint {hintLevel + 1}
                      </button>
                    )}
                    {guidedStep < strategySteps.length - 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setGuidedStep((s) =>
                            Math.min(strategySteps.length - 1, s + 1),
                          );
                          setHintLevel(0);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light"
                      >
                        Next step
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Player ────────────────────────────────────────────────── */}
          {showPlayer && skill && content && (
            <PracticeSkillPlayer
              skill={skill}
              content={content}
              title={unitTitle}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              glossary={skill === "reading" ? glossary : []}
              glossLanguage={lang}
              footer={submitBar}
              questionsNotice={
                mode === "skim" && skimTasks.length > 0 ? (
                  <PracticeBanner
                    icon={CheckCircle2}
                    className="border-emerald-200 bg-emerald-50 text-emerald-800"
                  >
                    Skim gate cleared · {skimResults.filter(Boolean).length}/
                    {skimTasks.length} main ideas correct — questions unlocked
                  </PracticeBanner>
                ) : null
              }
            />
          )}
        </PracticeScreen>
      )}
    </ApiDataShell>
  );
}
