"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  ExternalLink,
  LibraryBig,
  Map,
  MessageSquare,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  GlossedPassage,
  type GlossLanguage,
} from "@/components/practice/glossed-passage";
import { ReadingTutorDrawer } from "@/components/practice/reading-tutor-drawer";
import {
  LangToggle,
  PracticeBanner,
  PracticeResultCard,
  PracticeScreen,
  PracticeSplit,
} from "@/components/practice/practice-chrome";
import {
  getPracticeReview,
  normalizePracticeGlossary,
  normalizePracticeParaphraseDrills,
  normalizePracticeVocabPack,
  type PracticeParaphraseDrill,
  type PracticeReviewItem,
  type PracticeReviewPayload,
  type PracticeVocabItem,
} from "@/lib/api/practice";
import type { ReadingContent } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Props = {
  attemptId: string;
  basePath: string;
};

type TabId = "review" | "vocabulary" | "gym" | "strategy";

const TABS: {
  id: TabId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "review", label: "Review", icon: BookMarked },
  { id: "vocabulary", label: "Vocabulary", icon: LibraryBig },
  { id: "gym", label: "Paraphrase Gym", icon: Dumbbell },
  { id: "strategy", label: "Strategy", icon: Map },
];

const TRAP_LABELS: Record<string, { label: string; className: string }> = {
  "paraphrase-miss": {
    label: "Paraphrase miss",
    className: "bg-violet-50 text-violet-700",
  },
  "keyword-trap": { label: "Keyword trap", className: "bg-amber-50 text-amber-700" },
  "absolute-language": {
    label: "Absolute language",
    className: "bg-rose-50 text-brand-red",
  },
  "partial-match": { label: "Partial match", className: "bg-sky-50 text-sky-700" },
  "opposite-meaning": {
    label: "Opposite meaning",
    className: "bg-rose-50 text-brand-red",
  },
  "ng-vs-false": {
    label: "NG vs FALSE confusion",
    className: "bg-amber-50 text-amber-700",
  },
  "distractor-option": {
    label: "Distractor option",
    className: "bg-amber-50 text-amber-700",
  },
  "vocab-gap": { label: "Vocabulary gap", className: "bg-violet-50 text-violet-700" },
};

function verdictChipClass(verdict: string) {
  if (verdict === "correct")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (verdict === "incorrect") return "border-rose-200 bg-rose-50 text-brand-red";
  return "border-slate-200 bg-slate-50 text-muted";
}

function VerdictIcon({
  verdict,
  className,
}: {
  verdict: string;
  className?: string;
}) {
  if (verdict === "correct")
    return <CheckCircle2 className={cn("text-emerald-600", className)} />;
  if (verdict === "incorrect")
    return <XCircle className={cn("text-brand-red", className)} />;
  return <MinusCircle className={cn("text-slate-400", className)} />;
}

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

  useEffect(() => {
    void getPracticeReview(attemptId)
      .then((res) => setData(res))
      .catch(() => setError("Failed to load review"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  const content = data?.unit.content as ReadingContent | undefined;
  const passage = content?.passages?.[0];
  const items = useMemo(() => data?.items ?? [], [data]);
  const correctCount = items.filter((i) => i.verdict === "correct").length;
  const glossary = useMemo(
    () => normalizePracticeGlossary(data?.glossary ?? []),
    [data],
  );
  const vocabPack = useMemo(
    () => normalizePracticeVocabPack(data?.vocabPack ?? []),
    [data],
  );
  const paraphraseDrills = useMemo(
    () => normalizePracticeParaphraseDrills(data?.paraphraseDrills ?? []),
    [data],
  );

  function showEvidence(marker: string | null, quote: string) {
    if (!quote) return;
    setHighlightQuote(quote);
    setHighlightMarker(marker);
    if (!marker) return;
    document
      .querySelector(`[data-marker="${marker}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function askAbout(n: number) {
    setSelectedN(n);
    setTutorOpen(true);
  }

  return (
    <ApiDataShell loading={loading} error={error}>
      {!data ? null : !passage ? (
        <PracticeScreen>
          <PracticeResultCard
            title="Review unavailable"
            description="The passage for this attempt could not be loaded."
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
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 lg:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Link
                href={basePath}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate-100 hover:text-navy"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to hub
              </Link>
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy">Reading Review</p>
                <p className="truncate text-[11px] text-slate-400">
                  {data.unit.title}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                {correctCount}/{items.length} correct
                {data.attempt.score?.band != null &&
                  ` · Band ${data.attempt.score.band}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LangToggle value={lang} onChange={setLang} />
              <button
                type="button"
                onClick={() => setTutorOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-navy-light"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Ask tutor
              </button>
            </div>
          </header>

          <nav className="flex shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-4 lg:px-5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-[13px] transition-colors",
                  tab === id
                    ? "border-brand-red font-bold text-navy"
                    : "border-transparent text-muted hover:text-navy",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>

          {data.packStatus !== "ready" && (
            <PracticeBanner
              icon={AlertTriangle}
              className="border-amber-200 bg-amber-50 text-amber-900"
            >
              AI insights {data.packStatus} — scoring and evidence are shown, coach
              packs will appear once generation finishes.
            </PracticeBanner>
          )}

          {tab === "review" && (
            <ReviewTab
              passageTitle={passage.title}
              paragraphs={passage.paragraphs}
              glossary={glossary}
              lang={lang}
              items={items}
              evidenceChips={data.evidenceChips}
              highlightQuote={highlightQuote}
              highlightMarker={highlightMarker}
              selectedN={selectedN}
              onSelect={setSelectedN}
              onShowEvidence={showEvidence}
              onAskAbout={askAbout}
            />
          )}

          {tab === "vocabulary" && (
            <VocabularyTab
              words={vocabPack}
              onShowInPassage={showEvidence}
            />
          )}

          {tab === "gym" && <ParaphraseGymTab drills={paraphraseDrills} />}

          {tab === "strategy" && (
            <StrategyTab templates={data.strategyTemplates} />
          )}

          <ReadingTutorDrawer
            attemptId={attemptId}
            unitTitle={data.unit.title}
            questionN={selectedN}
            open={tutorOpen}
            onClose={() => setTutorOpen(false)}
          />
        </PracticeScreen>
      )}
    </ApiDataShell>
  );
}

/* ─────────────────────────────── review tab ─────────────────────────────── */

function ReviewTab({
  passageTitle,
  paragraphs,
  glossary,
  lang,
  items,
  evidenceChips,
  highlightQuote,
  highlightMarker,
  selectedN,
  onSelect,
  onShowEvidence,
  onAskAbout,
}: {
  passageTitle?: string;
  paragraphs: { marker?: string; text: string }[];
  glossary: ReturnType<typeof normalizePracticeGlossary>;
  lang: GlossLanguage;
  items: PracticeReviewItem[];
  evidenceChips: PracticeReviewPayload["evidenceChips"];
  highlightQuote: string | null;
  highlightMarker: string | null;
  selectedN: number | null;
  onSelect: (n: number | null) => void;
  onShowEvidence: (marker: string | null, quote: string) => void;
  onAskAbout: (n: number) => void;
}) {
  const correct = items.filter((i) => i.verdict === "correct").length;
  const shown = selectedN == null ? items : items.filter((i) => i.n === selectedN);

  return (
    <PracticeSplit
      leftLabel="Passage"
      rightLabel="Coach"
      leftWidthClassName="lg:w-[46%]"
      left={
        <GlossedPassage
          variant="bare"
          title={passageTitle}
          subtitle="Evidence chips highlight the answer sentence"
          paragraphs={paragraphs}
          glossary={glossary}
          language={lang}
          highlightQuote={highlightQuote}
          highlightMarker={highlightMarker}
        />
      }
      right={
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-5">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-navy" />
              <span className="text-[15px] font-extrabold text-navy">
                {correct}/{items.length}
              </span>
              <span className="text-xs text-muted">correct</span>
            </span>
            <span className="hidden h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-200 sm:block">
              <span
                className="block h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: items.length
                    ? `${(correct / items.length) * 100}%`
                    : "0%",
                }}
              />
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => onSelect(null)}
                className={cn(
                  "rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors",
                  selectedN == null
                    ? "bg-navy text-white"
                    : "bg-slate-100 text-muted hover:text-navy",
                )}
              >
                All
              </button>
              {items.map((item) => (
                <button
                  key={item.n}
                  type="button"
                  onClick={() => onSelect(selectedN === item.n ? null : item.n)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all",
                    verdictChipClass(item.verdict),
                    selectedN === item.n ? "scale-105 font-bold" : "font-medium",
                  )}
                >
                  <VerdictIcon verdict={item.verdict} className="h-2.5 w-2.5" />
                  Q{item.n}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 lg:px-5">
            {items.length === 0 ? (
              <EmptyPack label="No scored questions in this attempt." />
            ) : (
              shown.map((item) => (
                <CoachCard
                  key={item.n}
                  item={item}
                  onShowEvidence={onShowEvidence}
                  onAskAbout={onAskAbout}
                />
              ))
            )}

            {evidenceChips.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Evidence locator
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {evidenceChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        onSelect(chip.questionN);
                        onShowEvidence(chip.paragraphMarker, chip.sentenceQuote);
                      }}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-navy transition-colors hover:bg-slate-100"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Chips jump to highlighted text. For free-form questions, use Ask
                  tutor.
                </p>
              </div>
            )}
          </div>
        </>
      }
    />
  );
}

function CoachCard({
  item,
  onShowEvidence,
  onAskAbout,
}: {
  item: PracticeReviewItem;
  onShowEvidence: (marker: string | null, quote: string) => void;
  onAskAbout: (n: number) => void;
}) {
  const [open, setOpen] = useState(item.verdict !== "correct");
  const trap = item.trap
    ? (TRAP_LABELS[item.trap] ?? {
        label: item.trap,
        className: "bg-slate-100 text-muted",
      })
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left lg:px-5",
          open && "border-b border-slate-100",
        )}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2.5">
          <VerdictIcon verdict={item.verdict} className="h-4 w-4 shrink-0" />
          <span className="text-[13.5px] font-bold text-navy">Q{item.n}</span>
          {item.questionType && (
            <span className="text-xs text-slate-400">
              {item.questionType.replace(/_/g, " ")}
            </span>
          )}
          {trap && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                trap.className,
              )}
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              {trap.label}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="space-y-4 px-4 py-4 lg:px-5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Your answer
              </p>
              <p
                className={cn(
                  "text-sm font-bold",
                  item.verdict === "correct"
                    ? "text-emerald-700"
                    : "text-brand-red",
                )}
              >
                {formatAnswer(item.yourAnswer)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-600/70">
                Correct answer
              </p>
              <p className="text-sm font-bold text-emerald-700">
                {formatAnswer(item.correctAnswer)}
              </p>
            </div>
          </div>

          {item.rationale ? (
            <div>
              <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-navy">
                Explanation
              </p>
              <p className="text-[13px] leading-relaxed text-slate-700">
                {item.rationale}
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted">
              AI explanation not available for this question yet.
            </p>
          )}

          {item.paraphraseMap.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5">
              <p className="mb-2 text-[11.5px] font-bold text-blue-700">
                Paraphrase connection
              </p>
              <div className="space-y-2">
                {item.paraphraseMap.map((pair, i) => (
                  <div
                    key={i}
                    className="grid items-start gap-1.5 sm:grid-cols-[1fr_auto_1fr]"
                  >
                    <span className="rounded-lg bg-blue-100 px-2.5 py-1.5 text-xs leading-relaxed text-blue-800">
                      Q: “{pair.question}”
                    </span>
                    <span className="hidden pt-1 text-center text-sm text-blue-300 sm:block">
                      →
                    </span>
                    <span className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed text-slate-700">
                      P: “{pair.passage}”
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.options.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-navy">
                Why each option
              </p>
              <div className="space-y-1.5">
                {item.options.map((opt) => (
                  <div
                    key={opt.key}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border px-3 py-2",
                      opt.verdict === "correct"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                        opt.verdict === "correct"
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600",
                      )}
                    >
                      {opt.key}
                    </span>
                    {opt.whyNot && (
                      <span className="text-[12px] leading-relaxed text-slate-600">
                        {opt.whyNot}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Key terms:</span>
              {item.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11.5px] text-slate-600"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {item.evidence?.sentenceQuote && (
              <button
                type="button"
                onClick={() =>
                  onShowEvidence(
                    item.evidence?.paragraphMarker ?? null,
                    item.evidence?.sentenceQuote ?? "",
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                <ExternalLink className="h-3 w-3" />
                {item.evidence.paragraphMarker
                  ? `Para. ${item.evidence.paragraphMarker} — show evidence`
                  : "Show evidence"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onAskAbout(item.n)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              <MessageSquare className="h-3 w-3" />
              Ask about Q{item.n}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── vocabulary tab ───────────────────────────── */

function VocabularyTab({
  words,
  onShowInPassage,
}: {
  words: PracticeVocabItem[];
  onShowInPassage: (marker: string | null, quote: string) => void;
}) {
  const [active, setActive] = useState<string | null>(words[0]?.word ?? null);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-3xl">
        {words.length === 0 ? (
          <EmptyPack label="Vocabulary pack is being prepared for this unit." />
        ) : (
          <>
            <p className="mb-4 text-[13px] text-muted">
              Vocabulary from this passage — with collocations, word families, and
              IELTS paraphrase alternatives.
            </p>
            <div className="space-y-3">
              {words.map((word) => {
                const isActive = active === word.word;
                return (
                  <div
                    key={word.word}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-white transition-colors",
                      isActive ? "border-navy" : "border-slate-200",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActive(isActive ? null : word.word)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left",
                        isActive && "border-b border-slate-100",
                      )}
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-3">
                        <span className="text-base font-extrabold text-navy">
                          {word.word}
                        </span>
                        {word.occurrenceAnchor?.paragraphMarker && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-muted">
                            Para. {word.occurrenceAnchor.paragraphMarker}
                          </span>
                        )}
                      </span>
                      {isActive ? (
                        <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                    </button>

                    {isActive && (
                      <div className="space-y-4 px-5 pb-5 pt-3">
                        <div>
                          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                            In context
                          </p>
                          <p className="mt-1 text-[13.5px] text-slate-700">
                            {word.contextMeaning || "Definition unavailable."}
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          {word.collocations.length > 0 && (
                            <div>
                              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                Collocations
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {word.collocations.map((c) => (
                                  <span
                                    key={c}
                                    className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {word.wordFamily.length > 0 && (
                            <div>
                              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                Word family
                              </p>
                              <div className="mt-2 space-y-1">
                                {word.wordFamily.map((f) => (
                                  <p key={f} className="text-xs text-slate-600">
                                    {f}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {word.ieltsParaphrases.length > 0 && (
                          <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                              IELTS paraphrases
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {word.ieltsParaphrases.map((p) => (
                                <span
                                  key={p}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {word.occurrenceAnchor?.sentenceQuote && (
                          <button
                            type="button"
                            onClick={() =>
                              onShowInPassage(
                                word.occurrenceAnchor?.paragraphMarker ?? null,
                                word.occurrenceAnchor?.sentenceQuote ?? "",
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Show in passage
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────── paraphrase gym tab ────────────────────────── */

function ParaphraseGymTab({
  drills,
}: {
  drills: PracticeParaphraseDrill[];
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-2xl">
        {drills.length === 0 ? (
          <EmptyPack label="Paraphrase drills are being prepared for this unit." />
        ) : (
          <>
            <div className="mb-5">
              <h3 className="text-[15px] font-bold text-navy">Paraphrase Gym</h3>
              <p className="mt-1 text-[13px] text-muted">
                Practise rephrasing passage sentences — the core skill for IELTS
                Reading accuracy. Answers are checked locally.
              </p>
            </div>
            <div className="space-y-4">
              {drills.map((drill, idx) => {
                const value = answers[idx] ?? "";
                const isChecked = Boolean(checked[idx]);
                const ok =
                  isChecked &&
                  drill.acceptedAnswers.some((a) => {
                    const left = a.trim().toLowerCase();
                    const right = value.trim().toLowerCase();
                    return (
                      right.length > 0 &&
                      (left === right ||
                        left.includes(right) ||
                        right.includes(left))
                    );
                  });

                return (
                  <div
                    key={idx}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-white",
                      isChecked
                        ? ok
                          ? "border-emerald-200"
                          : "border-rose-200"
                        : "border-slate-200",
                    )}
                  >
                    <div className="border-b border-slate-100 bg-slate-50 px-5 pb-3 pt-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                          Drill {drill.n}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-muted">
                          {drill.type.replace(/[-_]/g, " ")}
                        </span>
                      </div>
                      <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-slate-800">
                        {drill.prompt}
                      </p>
                    </div>
                    <div className="space-y-3 px-5 py-4">
                      <textarea
                        rows={2}
                        value={value}
                        disabled={isChecked}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [idx]: e.target.value,
                          }))
                        }
                        placeholder="Type your answer here…"
                        className={cn(
                          "w-full resize-none rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none transition-colors focus:border-navy",
                          isChecked
                            ? ok
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-rose-200 bg-rose-50"
                            : "border-slate-200 bg-slate-50",
                        )}
                      />
                      {!isChecked ? (
                        <button
                          type="button"
                          disabled={value.trim().length === 0}
                          onClick={() =>
                            setChecked((prev) => ({ ...prev, [idx]: true }))
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-[13px] font-semibold text-white hover:bg-navy-light disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Check answer
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div
                            className={cn(
                              "flex items-center gap-2 rounded-xl border px-3.5 py-2",
                              ok
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-rose-200 bg-rose-50",
                            )}
                          >
                            {ok ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-brand-red" />
                            )}
                            <span
                              className={cn(
                                "text-[13px] font-semibold",
                                ok ? "text-emerald-700" : "text-brand-red",
                              )}
                            >
                              {ok
                                ? "Accepted!"
                                : "Close — see accepted forms below"}
                            </span>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                            <p className="mb-1.5 text-[11.5px] font-semibold text-slate-400">
                              Accepted answers
                            </p>
                            {drill.acceptedAnswers.map((a) => (
                              <p
                                key={a}
                                className="text-[12.5px] font-medium text-emerald-700"
                              >
                                ✓ {a}
                              </p>
                            ))}
                            {drill.explanation && (
                              <p className="mt-2 text-xs text-muted">
                                {drill.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── strategy tab ─────────────────────────────── */

function StrategyTab({
  templates,
}: {
  templates: PracticeReviewPayload["strategyTemplates"];
}) {
  const [activeType, setActiveType] = useState(
    templates[0]?.questionType ?? null,
  );
  const [stepIdx, setStepIdx] = useState(0);
  const card =
    templates.find((t) => t.questionType === activeType) ?? templates[0] ?? null;

  if (!card) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
        <div className="mx-auto max-w-2xl">
          <EmptyPack label="Strategy playbook is being prepared." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 px-2 py-4 lg:block">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Question types
        </p>
        {templates.map((tpl) => (
          <button
            key={tpl.questionType}
            type="button"
            onClick={() => {
              setActiveType(tpl.questionType);
              setStepIdx(0);
            }}
            className={cn(
              "mb-0.5 w-full rounded-xl px-3 py-2.5 text-left transition-colors",
              activeType === tpl.questionType
                ? "bg-navy text-white"
                : "text-slate-600 hover:bg-white",
            )}
          >
            <span className="block text-[12.5px] font-semibold">{tpl.label}</span>
            <span
              className={cn(
                "mt-0.5 block text-[11px]",
                activeType === tpl.questionType
                  ? "text-white/50"
                  : "text-slate-400",
              )}
            >
              {tpl.questionType.replace(/_/g, " ")}
            </span>
          </button>
        ))}
      </aside>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 lg:hidden">
            <select
              value={card.questionType}
              onChange={(e) => {
                setActiveType(e.target.value);
                setStepIdx(0);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-navy"
            >
              {templates.map((tpl) => (
                <option key={tpl.questionType} value={tpl.questionType}>
                  {tpl.label}
                </option>
              ))}
            </select>
          </div>

          <h3 className="mb-3 text-base font-extrabold text-navy">
            {card.label}
          </h3>

          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Decision rule
            </p>
            <p className="text-[13px] leading-relaxed text-blue-800">
              {card.decisionRule}
            </p>
          </div>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy">
            Strategy steps
          </p>
          <div className="mb-5 space-y-2">
            {card.steps.map((step, i) => {
              const isActive = stepIdx === i;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setStepIdx(i)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3.5 text-left transition-colors",
                    isActive
                      ? "border-navy bg-navy"
                      : "border-slate-200 bg-white hover:border-navy/30",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-[13.5px] font-bold",
                        isActive ? "text-white" : "text-navy",
                      )}
                    >
                      {step.title}
                    </span>
                  </span>
                  {isActive && (
                    <span className="mt-2 block pl-8">
                      <span className="block text-[13px] leading-relaxed text-white/80">
                        {step.instruction}
                      </span>
                      {step.studentAction && (
                        <span className="mt-2 block rounded-lg bg-white/10 px-3 py-2 text-xs">
                          <span className="font-semibold text-white">
                            Your action:{" "}
                          </span>
                          <span className="text-white/70">
                            {step.studentAction}
                          </span>
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {card.traps.length > 0 && (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy">
                Common traps
              </p>
              <div className="mb-5 space-y-2">
                {card.traps.map((trap, i) => (
                  <p
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-900"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    {trap}
                  </p>
                ))}
              </div>
            </>
          )}

          {card.hintLadder.length > 0 && (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy">
                Hint ladder
              </p>
              <div className="space-y-2">
                {card.hintLadder.map((hint, i) => (
                  <p
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] text-slate-700"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-[10px] font-bold text-slate-600">
                      {hint.level ?? i + 1}
                    </span>
                    <span>
                      <strong className="font-semibold">{hint.label}</strong>
                      {hint.instruction ? ` — ${hint.instruction}` : ""}
                    </span>
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── helpers ────────────────────────────────── */

function formatAnswer(value: unknown) {
  if (value == null || value === "") return "(skipped)";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function EmptyPack({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-muted">
      {label}
    </div>
  );
}
