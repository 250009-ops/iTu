"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Highlighter,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import {
  GlossedPassage,
  type GlossLanguage,
} from "@/components/practice/glossed-passage";
import { ReadingTutorDrawer } from "@/components/practice/reading-tutor-drawer";
import {
  getPracticeReview,
  type PracticeReviewPayload,
} from "@/lib/api/practice";
import type { ReadingContent } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Props = {
  attemptId: string;
  basePath: string;
};

type TabId = "review" | "vocabulary" | "gym" | "strategy";

const TRAP_LABELS: Record<string, string> = {
  "paraphrase-miss": "Paraphrase miss",
  "keyword-trap": "Keyword trap",
  "absolute-language": "Absolute language",
  "partial-match": "Partial match",
  "opposite-meaning": "Opposite meaning",
  "ng-vs-false": "NG vs False",
  "distractor-option": "Distractor option",
  "vocab-gap": "Vocab gap",
};

export function ReadingReviewView({ attemptId, basePath }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PracticeReviewPayload | null>(null);
  const [tab, setTab] = useState<TabId>("review");
  const [selectedN, setSelectedN] = useState<number | null>(null);
  const [highlightQuote, setHighlightQuote] = useState<string | null>(null);
  const [highlightMarker, setHighlightMarker] = useState<string | null>(null);
  const [lang, setLang] = useState<GlossLanguage>("en");
  const [tutorOpen, setTutorOpen] = useState(false);
  const [gymAnswers, setGymAnswers] = useState<Record<number, string>>({});
  const [gymChecked, setGymChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    void getPracticeReview(attemptId)
      .then((res) => {
        setData(res);
        setSelectedN(res.items[0]?.n ?? null);
      })
      .catch(() => setError("Failed to load review"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  const content = data?.unit.content as ReadingContent | undefined;
  const passage = content?.passages?.[0];
  const selected = useMemo(
    () => data?.items.find((i) => i.n === selectedN) ?? null,
    [data, selectedN],
  );

  function showEvidence(n: number) {
    const item = data?.items.find((i) => i.n === n);
    if (!item?.evidence?.sentenceQuote) return;
    setSelectedN(n);
    setHighlightQuote(item.evidence.sentenceQuote);
    setHighlightMarker(item.evidence.paragraphMarker);
    const el = document.querySelector(
      `[data-marker="${item.evidence.paragraphMarker}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const score = data?.attempt.score;
  const correctCount = data?.items.filter((i) => i.verdict === "correct").length ?? 0;

  return (
    <ApiDataShell loading={loading} error={error}>
      {data && passage && (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Reading review
                </p>
                <h1 className="text-2xl font-bold text-navy">{data.unit.title}</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {correctCount} / {data.items.length} correct
                  {score?.band != null ? ` · Band ${score.band}` : ""}
                  {data.packStatus !== "ready" && (
                    <span className="ml-2 text-amber-700">
                      · AI insights {data.packStatus}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setTutorOpen(true)}
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask tutor
                </Button>
                <Link
                  href={basePath}
                  className="inline-flex items-center rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white"
                >
                  Back to hub
                </Link>
              </div>
            </div>

            <div className="mx-auto mt-4 flex max-w-6xl flex-wrap gap-1.5">
              {data.items.map((item) => (
                <button
                  key={item.n}
                  type="button"
                  onClick={() => {
                    setSelectedN(item.n);
                    setTab("review");
                  }}
                  className={cn(
                    "h-8 min-w-8 rounded-lg px-2 text-xs font-semibold",
                    item.verdict === "correct" && "bg-emerald-100 text-emerald-800",
                    item.verdict === "incorrect" && "bg-rose-100 text-rose-800",
                    item.verdict === "skipped" && "bg-slate-100 text-slate-600",
                    selectedN === item.n && "ring-2 ring-navy ring-offset-1",
                  )}
                >
                  {item.n}
                </button>
              ))}
            </div>

            <nav className="mx-auto mt-4 flex max-w-6xl gap-1 border-t border-slate-100 pt-3">
              {(
                [
                  ["review", "Review", BookOpen],
                  ["vocabulary", "Vocabulary", Sparkles],
                  ["gym", "Paraphrase Gym", Target],
                  ["strategy", "Strategy", Highlighter],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
                    tab === id
                      ? "bg-navy text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </header>

          <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-2">
            <GlossedPassage
              title={passage.title}
              paragraphs={passage.paragraphs}
              glossary={data.glossary}
              language={lang}
              onLanguageChange={setLang}
              highlightQuote={highlightQuote}
              highlightMarker={highlightMarker}
            />

            <div className="space-y-4">
              {tab === "review" && selected && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-navy">
                      Question {selected.n}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        selected.verdict === "correct" &&
                          "bg-emerald-100 text-emerald-800",
                        selected.verdict === "incorrect" &&
                          "bg-rose-100 text-rose-800",
                        selected.verdict === "skipped" &&
                          "bg-slate-100 text-slate-600",
                      )}
                    >
                      {selected.verdict}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase text-muted">Your answer</dt>
                      <dd className="font-medium">
                        {formatAnswer(selected.yourAnswer)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted">
                        Correct answer
                      </dt>
                      <dd className="font-medium text-emerald-800">
                        {formatAnswer(selected.correctAnswer)}
                      </dd>
                    </div>
                  </dl>

                  {selected.trap && (
                    <p className="mt-3 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                      Trap: {TRAP_LABELS[selected.trap] ?? selected.trap}
                    </p>
                  )}

                  {selected.rationale && (
                    <p className="mt-4 text-sm leading-relaxed text-slate-700">
                      {selected.rationale}
                    </p>
                  )}

                  {selected.paraphraseMap.length > 0 && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-muted">
                        Paraphrase map
                      </p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {selected.paraphraseMap.map((pair, i) => (
                          <li key={i} className="grid gap-1 sm:grid-cols-2">
                            <span className="rounded-lg bg-white px-2 py-1">
                              Q: {pair.question}
                            </span>
                            <span className="rounded-lg bg-white px-2 py-1">
                              Passage: {pair.passage}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!selected.evidence?.sentenceQuote}
                      onClick={() => showEvidence(selected.n)}
                    >
                      <Highlighter className="h-4 w-4" />
                      Show evidence
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setTutorOpen(true)}
                    >
                      Ask about Q{selected.n}
                    </Button>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted">
                      Evidence locator
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data.evidenceChips.map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => showEvidence(chip.questionN)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-navy hover:bg-slate-100"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Chips only here — type free questions in Ask tutor.
                    </p>
                  </div>
                </div>
              )}

              {tab === "vocabulary" && (
                <div className="space-y-3">
                  {data.vocabPack.length === 0 ? (
                    <EmptyPack label="Vocabulary pack is being prepared." />
                  ) : (
                    data.vocabPack.map((item) => (
                      <div
                        key={item.word}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="font-semibold text-navy">{item.word}</h4>
                          <button
                            type="button"
                            className="text-xs text-navy underline"
                            onClick={() => {
                              setHighlightQuote(item.occurrenceAnchor.sentenceQuote);
                              setHighlightMarker(
                                item.occurrenceAnchor.paragraphMarker,
                              );
                            }}
                          >
                            Show in passage
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">
                          {item.contextMeaning}
                        </p>
                        {item.collocations.length > 0 && (
                          <p className="mt-2 text-xs text-slate-500">
                            Collocations: {item.collocations.join(" · ")}
                          </p>
                        )}
                        {item.ieltsParaphrases.length > 0 && (
                          <p className="mt-1 text-xs text-slate-500">
                            IELTS paraphrases: {item.ieltsParaphrases.join(" · ")}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "gym" && (
                <div className="space-y-3">
                  {data.paraphraseDrills.length === 0 ? (
                    <EmptyPack label="Paraphrase drills are being prepared." />
                  ) : (
                    data.paraphraseDrills.map((drill, idx) => {
                      const key = idx;
                      const checked = gymChecked[key];
                      const value = gymAnswers[key] ?? "";
                      const ok =
                        checked &&
                        drill.acceptedAnswers.some(
                          (a) =>
                            a.trim().toLowerCase() === value.trim().toLowerCase(),
                        );
                      return (
                        <div
                          key={idx}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <p className="text-xs font-semibold uppercase text-muted">
                            Q{drill.n} · {drill.type}
                          </p>
                          <p className="mt-1 text-sm text-slate-800">{drill.prompt}</p>
                          <input
                            value={value}
                            onChange={(e) =>
                              setGymAnswers((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Your paraphrase…"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                setGymChecked((prev) => ({ ...prev, [key]: true }))
                              }
                            >
                              Check
                            </Button>
                            {checked && (
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  ok ? "text-emerald-700" : "text-rose-700",
                                )}
                              >
                                {ok ? "Accepted" : "Try again / see explanation"}
                              </span>
                            )}
                          </div>
                          {checked && !ok && (
                            <p className="mt-2 text-xs text-slate-600">
                              {drill.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {tab === "strategy" && (
                <div className="space-y-3">
                  {data.strategyTemplates.map((tpl) => (
                    <div
                      key={tpl.questionType}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <h4 className="font-semibold text-navy">{tpl.label}</h4>
                      <p className="mt-1 text-sm text-slate-700">{tpl.decisionRule}</p>
                      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                        {tpl.steps.map((step) => (
                          <li key={step.id}>
                            <span className="font-medium">{step.title}: </span>
                            {step.instruction}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ReadingTutorDrawer
            attemptId={attemptId}
            questionN={selectedN}
            open={tutorOpen}
            onClose={() => setTutorOpen(false)}
          />
        </div>
      )}
    </ApiDataShell>
  );
}

function formatAnswer(value: unknown) {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function EmptyPack({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
      {label}
    </div>
  );
}
