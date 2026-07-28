"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Eye,
  FileText,
  Flame,
  Headphones,
  Layers,
  PenLine,
  PlayCircle,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PracticeModeChooser } from "@/components/practice/practice-mode-chooser";
import { practiceModeMeta } from "@/components/practice/practice-chrome";
import {
  createWritingSession,
  getPracticeAllowance,
  getPracticeAttempts,
  getPracticeLibrary,
  getWritingPrompts,
  getWritingSessions,
  startPracticeAttempt,
  type PracticeAllowance,
  type PracticeAttemptMode,
  type PracticeAttemptSummary,
  type PracticeLibraryUnit,
  type WritingPracticeSession,
} from "@/lib/api/practice";
import {
  formatAttemptStatus,
  groupLibraryBySection,
  hasCreditsForUnit,
  PRACTICE_CREDIT_META,
  PRACTICE_LIBRARY_SECTIONS,
  type PracticeCreditKey,
  type PracticeHubTab,
  type PracticeLibrarySection,
} from "@/lib/practice/hub";
import { cn } from "@/lib/utils";

type Props = {
  basePath: string;
};

const HUB_TABS: {
  id: PracticeHubTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "listening", label: "Listening", icon: Headphones },
  { id: "writing", label: "Writing (AI)", icon: PenLine },
];

/**
 * Presentation for each library section. Keyed by section id so the shared
 * `PRACTICE_LIBRARY_SECTIONS` contract stays untouched.
 */
const SECTION_STYLE: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>;
    tile: string;
    badge: string;
    badgeClassName: string;
    actionLabel: string;
    actionClassName: string;
  }
> = {
  "reading-passages": {
    icon: FileText,
    tile: "bg-slate-100 text-navy",
    badge: "Mixed question types",
    badgeClassName: "bg-slate-100 text-muted",
    actionLabel: "Start",
    actionClassName: "bg-brand-red hover:bg-brand-red-hover",
  },
  "reading-drills": {
    icon: Zap,
    tile: "bg-blue-50 text-blue-700",
    badge: "Target one format",
    badgeClassName: "bg-blue-50 text-blue-700",
    actionLabel: "Drill",
    actionClassName: "bg-blue-700 hover:bg-blue-800",
  },
  "listening-sections": {
    icon: Headphones,
    tile: "bg-sky-50 text-sky-700",
    badge: "Audio + questions",
    badgeClassName: "bg-sky-50 text-sky-700",
    actionLabel: "Start",
    actionClassName: "bg-brand-red hover:bg-brand-red-hover",
  },
  "listening-drills": {
    icon: Layers,
    tile: "bg-blue-50 text-blue-700",
    badge: "Single format",
    badgeClassName: "bg-blue-50 text-blue-700",
    actionLabel: "Drill",
    actionClassName: "bg-blue-700 hover:bg-blue-800",
  },
};

const FALLBACK_SECTION_STYLE = SECTION_STYLE["reading-passages"];

/** Credit keys surfaced first in the compact allowance chip, per tab. */
const TAB_PRIMARY_CREDITS: Record<PracticeHubTab, PracticeCreditKey[]> = {
  reading: ["readingPassages", "readingQuestionTypes"],
  listening: ["listeningSections", "listeningQuestionTypes"],
  writing: ["aiWritingEssays", "readingPassages"],
};

export function PracticeHubView({ basePath }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PracticeHubTab>("reading");
  const [allowance, setAllowance] = useState<PracticeAllowance | null>(null);
  const [library, setLibrary] = useState<PracticeLibraryUnit[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttemptSummary[]>([]);
  const [prompts, setPrompts] = useState<Awaited<ReturnType<typeof getWritingPrompts>>>(
    [],
  );
  const [writingSessions, setWritingSessions] = useState<WritingPracticeSession[]>(
    [],
  );
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startingPromptId, setStartingPromptId] = useState<string | null>(null);
  const [modeUnit, setModeUnit] = useState<PracticeLibraryUnit | null>(null);
  const [allowanceOpen, setAllowanceOpen] = useState(false);

  useEffect(() => {
    void Promise.all([
      getPracticeAllowance(),
      getPracticeLibrary(),
      getPracticeAttempts(),
      getWritingPrompts(),
      getWritingSessions(),
    ])
      .then(([a, lib, att, pr, sessions]) => {
        setAllowance(a);
        setLibrary(lib);
        setAttempts(att);
        setPrompts(pr);
        setWritingSessions(sessions);
      })
      .catch(() => setError("Failed to load practice hub"))
      .finally(() => setLoading(false));
  }, []);

  const tabSections = useMemo(
    () => PRACTICE_LIBRARY_SECTIONS.filter((section) => section.tab === activeTab),
    [activeTab],
  );
  const task1Prompts = useMemo(
    () => prompts.filter((prompt) => prompt.taskNumber === 1),
    [prompts],
  );
  const task2Prompts = useMemo(
    () => prompts.filter((prompt) => prompt.taskNumber === 2),
    [prompts],
  );
  const stats = useMemo(() => summarizeAttempts(attempts), [attempts]);
  const resumable = useMemo(
    () => attempts.find((attempt) => attempt.status === "in_progress") ?? null,
    [attempts],
  );
  const tabCounts = useMemo(
    () => ({
      reading: library.filter((unit) => unit.skill === "reading").length,
      listening: library.filter((unit) => unit.skill === "listening").length,
      writing: prompts.length,
    }),
    [library, prompts],
  );

  async function handleStartUnit(unit: PracticeLibraryUnit) {
    if (allowance && !hasCreditsForUnit(allowance, unit)) {
      toast("No attempts remaining", {
        description: "Purchase a package to unlock more.",
        variant: "warning",
      });
      return;
    }

    if (unit.skill === "reading") {
      setModeUnit(unit);
      return;
    }

    await beginUnit(unit, "practice");
  }

  async function beginUnit(unit: PracticeLibraryUnit, mode: PracticeAttemptMode) {
    setStartingId(unit.id);
    try {
      const result = await startPracticeAttempt(unit.id, mode);
      window.location.href = `${basePath}/attempt/${result.attempt.id}`;
    } catch (err) {
      setModeUnit(null);
      toast("Could not start practice", {
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
      setStartingId(null);
    }
  }

  async function handleStartWriting(promptId: string) {
    setStartingPromptId(promptId);
    try {
      const session = await createWritingSession(promptId);
      window.location.href = `${basePath}/writing/${session.id}`;
    } catch (err) {
      toast("Could not open writing coach", {
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setStartingPromptId(null);
    }
  }

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 lg:px-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight tracking-[-0.4px] text-navy">
              Practice
            </h1>
            <p className="mt-1 max-w-lg text-[13.5px] text-muted">
              Choose a unit, select a mode, and work the passage at your own pace.
            </p>
          </div>

          <CompactAllowance
            allowance={allowance}
            activeTab={activeTab}
            open={allowanceOpen}
            onToggle={() => setAllowanceOpen((v) => !v)}
            shopHref={`${basePath}/shop`}
          />
        </header>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatTile
            icon={Flame}
            iconClassName="bg-amber-50 text-amber-500"
            label="Practice streak"
            value={
              stats.streakDays > 0
                ? `${stats.streakDays} day${stats.streakDays === 1 ? "" : "s"}`
                : "Start today"
            }
          />
          <StatTile
            icon={TrendingUp}
            iconClassName="bg-slate-100 text-navy"
            label="Avg band this week"
            value={stats.weekBand != null ? `Band ${stats.weekBand}` : "—"}
          />
          <StatTile
            icon={Award}
            iconClassName="bg-emerald-50 text-emerald-600"
            label="Best result"
            value={stats.bestBand != null ? `Band ${stats.bestBand}` : "—"}
          />
        </div>

        <div className="mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {HUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] transition-colors",
                  isActive
                    ? "bg-navy font-semibold text-white"
                    : "text-muted hover:bg-slate-50 hover:text-navy",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
                {isActive && (
                  <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-semibold">
                    {tab.id === "writing"
                      ? `${tabCounts.writing} prompts`
                      : `${tabCounts[tab.id]} units`}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "writing" ? (
          <WritingTabContent
            basePath={basePath}
            allowance={allowance}
            task1Prompts={task1Prompts}
            task2Prompts={task2Prompts}
            sessions={writingSessions}
            startingPromptId={startingPromptId}
            onStartPrompt={handleStartWriting}
          />
        ) : (
          <div className="animate-fade-in">
            {resumable && (
              <ResumeStrip
                attempt={resumable}
                href={`${basePath}/attempt/${resumable.id}`}
              />
            )}

            {tabSections.map((section) => (
              <LibrarySection
                key={section.id}
                section={section}
                units={groupLibraryBySection(library, section)}
                allowance={allowance}
                startingId={startingId}
                shopHref={`${basePath}/shop`}
                onStart={handleStartUnit}
              />
            ))}

            <RecentAttemptsSection attempts={attempts} basePath={basePath} />
          </div>
        )}
      </div>

      <PracticeModeChooser
        open={modeUnit != null}
        unitTitle={modeUnit?.title ?? ""}
        starting={startingId != null}
        onSelect={(mode) => {
          if (modeUnit) void beginUnit(modeUnit, mode);
        }}
        onClose={() => {
          if (startingId) return;
          setModeUnit(null);
        }}
      />
    </ApiDataShell>
  );
}

/* ────────────────────────────── header pieces ───────────────────────────── */

function CompactAllowance({
  allowance,
  activeTab,
  open,
  onToggle,
  shopHref,
}: {
  allowance: PracticeAllowance | null;
  activeTab: PracticeHubTab;
  open: boolean;
  onToggle: () => void;
  shopHref: string;
}) {
  if (!allowance) return null;

  const [primaryKey, secondaryKey] = TAB_PRIMARY_CREDITS[activeTab];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-3"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-navy" />
            <span className="text-xs font-semibold text-navy">
              {allowance[primaryKey]} {PRACTICE_CREDIT_META[primaryKey].shortLabel.toLowerCase()}
            </span>
          </span>
          <span className="text-[10px] text-slate-300">·</span>
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-muted">
              {allowance[secondaryKey]}{" "}
              {PRACTICE_CREDIT_META[secondaryKey].shortLabel.toLowerCase()}
            </span>
          </span>
          {open ? (
            <ChevronUp className="h-3 w-3 text-slate-400" />
          ) : (
            <ChevronDown className="h-3 w-3 text-slate-400" />
          )}
        </button>
        <Link
          href={shopHref}
          className="text-xs text-slate-400 underline decoration-slate-300 underline-offset-2 hover:text-navy"
        >
          Packages
        </Link>
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 border-t border-slate-100 pt-3">
          {(Object.keys(PRACTICE_CREDIT_META) as PracticeCreditKey[]).map((key) => (
            <div key={key}>
              <p className="text-[11px] text-slate-400">
                {PRACTICE_CREDIT_META[key].label}
              </p>
              <p className="text-sm font-bold text-navy">{allowance[key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          iconClassName,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-navy">{value}</p>
      </div>
    </div>
  );
}

function ResumeStrip({
  attempt,
  href,
}: {
  attempt: PracticeAttemptSummary;
  href: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 bg-white px-5 py-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <RotateCcw className="h-[17px] w-[17px]" />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-navy">
            Continue where you left off
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {attempt.unit.title}
          </p>
        </div>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-light"
      >
        Continue
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ───────────────────────────── library sections ─────────────────────────── */

function HubSection({
  title,
  badge,
  badgeClassName,
  count,
  children,
}: {
  title: string;
  badge?: string;
  badgeClassName?: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-navy">{title}</h2>
          {badge && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px]",
                badgeClassName ?? "bg-slate-100 text-muted",
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {count && <span className="text-xs text-slate-400">{count}</span>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {children}
      </div>
    </section>
  );
}

function LibrarySection({
  section,
  units,
  allowance,
  startingId,
  shopHref,
  onStart,
}: {
  section: PracticeLibrarySection;
  units: PracticeLibraryUnit[];
  allowance: PracticeAllowance | null;
  startingId: string | null;
  shopHref: string;
  onStart: (unit: PracticeLibraryUnit) => void;
}) {
  const style = SECTION_STYLE[section.id] ?? FALLBACK_SECTION_STYLE;
  const Icon = style.icon;
  const remaining = allowance?.[section.creditKey] ?? 0;

  return (
    <HubSection
      title={section.title}
      badge={style.badge}
      badgeClassName={style.badgeClassName}
      count={
        units.length > 0
          ? `${units.length} available · ${remaining} credit${remaining === 1 ? "" : "s"} left`
          : undefined
      }
    >
      {units.length === 0 ? (
        <EmptyRow
          message="No units included in your packages for this category yet."
          actionHref={shopHref}
          actionLabel="View packages"
        />
      ) : (
        units.map((unit, idx) => {
          const canStart = allowance ? hasCreditsForUnit(allowance, unit) : false;
          return (
            <div
              key={unit.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50/60",
                idx < units.length - 1 && "border-b border-slate-100",
              )}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span
                  className={cn(
                    "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-black/5",
                    style.tile,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-navy">
                      {unit.title}
                    </span>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-400">
                      {unit.code}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1 text-[11.5px] text-slate-400">
                      <Target className="h-2.5 w-2.5" />
                      {unit.questionCount} questions
                    </span>
                    <span className="flex items-center gap-1 text-[11.5px] text-slate-400">
                      <Clock className="h-2.5 w-2.5" />
                      {unit.durationMin} min
                    </span>
                    {unit.questionType && (
                      <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                        {formatQuestionType(unit.questionType)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {canStart ? (
                <button
                  type="button"
                  disabled={startingId === unit.id}
                  onClick={() => void onStart(unit)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors disabled:opacity-60",
                    style.actionClassName,
                  )}
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  {startingId === unit.id ? "Starting…" : style.actionLabel}
                </button>
              ) : (
                <Link
                  href={shopHref}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-[12.5px] font-medium text-navy transition-colors hover:bg-slate-100"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Unlock
                </Link>
              )}
            </div>
          );
        })
      )}
    </HubSection>
  );
}

function RecentAttemptsSection({
  attempts,
  basePath,
}: {
  attempts: PracticeAttemptSummary[];
  basePath: string;
}) {
  if (attempts.length === 0) return null;

  return (
    <HubSection title="Recent attempts">
      {attempts.slice(0, 8).map((attempt, idx, arr) => {
        const band = attempt.score?.band ?? null;
        const bandStyle = bandBadgeStyle(band);
        const modeMeta = practiceModeMeta(attempt.mode);
        return (
          <div
            key={attempt.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/60",
              idx < arr.length - 1 && "border-b border-slate-100",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                {attempt.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : attempt.status === "in_progress" ? (
                  <Circle className="h-5 w-5 text-amber-500" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium text-navy">
                    {attempt.unit.title}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                      modeMeta.chip,
                    )}
                  >
                    {modeMeta.label}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-[11px] text-slate-400">
                    {formatAttemptDate(attempt.completedAt ?? attempt.startedAt)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatAttemptStatus(attempt.status)}
                  </span>
                  {band != null && (
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[11px] font-bold",
                        bandStyle,
                      )}
                    >
                      Band {band}
                    </span>
                  )}
                  {attempt.score?.rawScore != null && (
                    <span className="text-[11px] text-muted">
                      {attempt.score.rawScore}/
                      {attempt.score.totalQuestions ?? "?"} correct
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link
              href={`${basePath}/attempt/${attempt.id}`}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                attempt.status === "completed"
                  ? "border border-slate-200 bg-slate-50 font-medium text-slate-600 hover:bg-slate-100"
                  : "bg-navy text-white hover:bg-navy-light",
              )}
            >
              {attempt.status === "completed" ? (
                <>
                  <Eye className="h-3 w-3" />
                  Review
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3" />
                  Continue
                </>
              )}
            </Link>
          </div>
        );
      })}
    </HubSection>
  );
}

/* ───────────────────────────── writing tab ──────────────────────────────── */

function WritingTabContent({
  basePath,
  allowance,
  task1Prompts,
  task2Prompts,
  sessions,
  startingPromptId,
  onStartPrompt,
}: {
  basePath: string;
  allowance: PracticeAllowance | null;
  task1Prompts: Awaited<ReturnType<typeof getWritingPrompts>>;
  task2Prompts: Awaited<ReturnType<typeof getWritingPrompts>>;
  sessions: WritingPracticeSession[];
  startingPromptId: string | null;
  onStartPrompt: (promptId: string) => void;
}) {
  const writingRemaining = allowance?.aiWritingEssays ?? 0;
  const shopHref = `${basePath}/shop`;

  return (
    <div className="animate-fade-in">
      <section className="mb-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-navy">AI Writing Coach</h2>
            <p className="mt-1 text-[13px] text-muted">
              Write Task 1 or Task 2 essays section by section, then get instant
              AI improvements. Each AI review uses one included attempt.
            </p>
            <p className="mt-2 text-xs text-muted">
              AI reviews remaining:{" "}
              <span className="font-semibold text-navy">{writingRemaining}</span>
              {writingRemaining === 0 &&
                " — purchase a package to unlock writing prompts and AI feedback"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`${basePath}/writing`}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-light"
          >
            <PenLine className="h-4 w-4" />
            Open writing coach
          </Link>
          {writingRemaining === 0 && (
            <Link
              href={shopHref}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-navy transition-colors hover:bg-slate-50"
            >
              <ShoppingBag className="h-4 w-4" />
              View packages
            </Link>
          )}
        </div>
      </section>

      <WritingPromptsSection
        title="Task 1 prompts"
        badge="Charts, graphs, diagrams"
        prompts={task1Prompts}
        startingPromptId={startingPromptId}
        onStart={onStartPrompt}
      />

      <WritingPromptsSection
        title="Task 2 prompts"
        badge="Opinion, discussion, problem/solution"
        prompts={task2Prompts}
        startingPromptId={startingPromptId}
        onStart={onStartPrompt}
      />

      {sessions.length > 0 && (
        <HubSection title="Your writing sessions">
          {sessions.slice(0, 8).map((session, idx, arr) => (
            <div
              key={session.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/60",
                idx < arr.length - 1 && "border-b border-slate-100",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-navy">
                  {session.prompt?.title ?? session.sessionCode}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Task {session.taskNumber} · {session.status}
                </p>
              </div>
              <Link
                href={`${basePath}/writing/${session.id}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-navy hover:bg-slate-100"
              >
                Continue
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </HubSection>
      )}
    </div>
  );
}

function WritingPromptsSection({
  title,
  badge,
  prompts,
  startingPromptId,
  onStart,
}: {
  title: string;
  badge: string;
  prompts: Awaited<ReturnType<typeof getWritingPrompts>>;
  startingPromptId: string | null;
  onStart: (promptId: string) => void;
}) {
  return (
    <HubSection
      title={title}
      badge={badge}
      badgeClassName="bg-violet-50 text-violet-700"
      count={prompts.length > 0 ? `${prompts.length} available` : undefined}
    >
      {prompts.length === 0 ? (
        <EmptyRow message="No published prompts yet." />
      ) : (
        prompts.map((prompt, idx, arr) => (
          <div
            key={prompt.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50/60",
              idx < arr.length - 1 && "border-b border-slate-100",
            )}
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-black/5 bg-violet-50 text-violet-700">
                <PenLine className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-navy">
                    {prompt.title}
                  </span>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-400">
                    {prompt.code}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-slate-400">
                  Minimum {prompt.minWords} words
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 rounded-xl"
              disabled={startingPromptId === prompt.id}
              onClick={() => void onStart(prompt.id)}
            >
              Start essay
            </Button>
          </div>
        ))
      )}
    </HubSection>
  );
}

/* ─────────────────────────────── helpers ────────────────────────────────── */

function EmptyRow({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-muted">{message}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-navy hover:bg-slate-100"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function formatQuestionType(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

function bandBadgeStyle(band: number | null) {
  if (band == null) return "border-slate-200 bg-slate-50 text-muted";
  if (band >= 7.5) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (band >= 6.5) return "border-slate-200 bg-slate-50 text-navy";
  if (band >= 6) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-brand-red";
}

function formatAttemptDate(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Derives the hub headline stats from real attempt history — streak of
 * consecutive practice days, this week's average band, and the best band.
 */
function summarizeAttempts(attempts: PracticeAttemptSummary[]) {
  const bands: number[] = [];
  const weekBands: number[] = [];
  const days = new Set<string>();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const attempt of attempts) {
    const stamp = attempt.completedAt ?? attempt.startedAt;
    const date = stamp ? new Date(stamp) : null;
    if (date && !Number.isNaN(date.getTime())) {
      days.add(dayKey(date));
      if (attempt.score?.band != null && date.getTime() >= weekAgo) {
        weekBands.push(attempt.score.band);
      }
    }
    if (attempt.score?.band != null) bands.push(attempt.score.band);
  }

  let streakDays = 0;
  const cursor = new Date();
  // Allow the streak to start yesterday so it survives before today's session.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const average = (list: number[]) =>
    list.length
      ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10
      : null;

  return {
    streakDays,
    weekBand: average(weekBands),
    bestBand: bands.length ? Math.max(...bands) : null,
  };
}
