"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Headphones,
  PenLine,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
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
  type PracticeWallet,
  type WritingPracticeSession,
} from "@/lib/api/practice";
import {
  formatAttemptStatus,
  formatUnitType,
  groupLibraryBySection,
  hasCreditsForUnit,
  PRACTICE_CREDIT_META,
  PRACTICE_LIBRARY_SECTIONS,
  totalPracticeAllowance,
  type PracticeHubTab,
} from "@/lib/practice/hub";
import { cn } from "@/lib/utils";

type Props = {
  basePath: string;
};

const HUB_TABS: { id: PracticeHubTab; label: string; icon: typeof BookOpen }[] = [
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "listening", label: "Listening", icon: Headphones },
  { id: "writing", label: "Writing (AI)", icon: PenLine },
];

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

  const totalRemaining = allowance ? totalPracticeAllowance(allowance) : 0;
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
    setModeUnit(null);
    try {
      const result = await startPracticeAttempt(unit.id, mode);
      window.location.href = `${basePath}/attempt/${result.attempt.id}`;
    } catch (err) {
      toast("Could not start practice", {
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
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
      <div className="mx-auto max-w-6xl space-y-8 p-4 lg:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Practice Hub</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Build skills with reading and listening practice, or get AI feedback on
              your writing. Each activity uses one included attempt from your package.
            </p>
          </div>
          <Link
            href={`${basePath}/shop`}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90"
          >
            <ShoppingBag className="h-4 w-4" />
            View packages
          </Link>
        </header>

        {allowance && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-navy">
                  Your practice allowance
                </h2>
                <p className="text-xs text-muted">
                  {totalRemaining > 0
                    ? `${totalRemaining} practice attempt${totalRemaining === 1 ? "" : "s"} remaining`
                    : "No practice attempts yet — purchase a package to get started"}
                </p>
              </div>
              {totalRemaining === 0 && (
                <Link
                  href={`${basePath}/shop`}
                  className="text-sm font-medium text-brand-red hover:underline"
                >
                  View packages
                </Link>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(PRACTICE_CREDIT_META) as (keyof PracticeWallet)[]).map(
                (key) => {
                  const meta = PRACTICE_CREDIT_META[key];
                  const balance = allowance[key];
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        <p className="text-xs font-medium text-muted">{meta.shortLabel}</p>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-navy">{balance}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {meta.remainingLabel}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
          {HUB_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-navy text-white"
                    : "text-muted hover:bg-slate-100 hover:text-navy",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
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
          <div className="space-y-10">
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
          </div>
        )}

        <RecentAttemptsSection attempts={attempts} basePath={basePath} />
      </div>

      {modeUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-navy">Choose Reading mode</h2>
            <p className="mt-1 text-sm text-muted">{modeUnit.title}</p>
            <div className="mt-4 grid gap-2">
              {(
                [
                  ["practice", "Practice", "Timed questions with AI review after submit"],
                  ["skim", "Skim trainer", "Main-idea checks unlock questions"],
                  ["scan", "Scan trainer", "Timed find-the-detail races"],
                  ["guided", "Guided coach", "Step-by-step strategy hand-holding"],
                ] as const
              ).map(([mode, label, desc]) => (
                <button
                  key={mode}
                  type="button"
                  disabled={startingId === modeUnit.id}
                  onClick={() => void beginUnit(modeUnit, mode)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-navy hover:bg-slate-50"
                >
                  <p className="font-semibold text-navy">{label}</p>
                  <p className="text-xs text-muted">{desc}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 text-sm text-muted hover:text-navy"
              onClick={() => setModeUnit(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </ApiDataShell>
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
  section: (typeof PRACTICE_LIBRARY_SECTIONS)[number];
  units: PracticeLibraryUnit[];
  allowance: PracticeAllowance | null;
  startingId: string | null;
  shopHref: string;
  onStart: (unit: PracticeLibraryUnit) => void;
}) {
  const remaining = allowance?.[section.creditKey] ?? 0;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-navy">{section.title}</h2>
        <p className="mt-0.5 text-sm text-muted">{section.description}</p>
        <p className="mt-1 text-xs text-muted">
          You have{" "}
          <span className="font-semibold text-navy">{remaining}</span>{" "}
          {PRACTICE_CREDIT_META[section.creditKey].remainingLabel}.
        </p>
      </div>

      {units.length === 0 ? (
        <EmptyPanel message="No practice included in your packages for this category yet. Purchase a package to unlock content." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="hidden px-4 py-3 sm:table-cell">Format</th>
                <th className="hidden px-4 py-3 md:table-cell">Questions</th>
                <th className="hidden px-4 py-3 md:table-cell">Time</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const canStart = allowance
                  ? hasCreditsForUnit(allowance, unit)
                  : false;
                return (
                  <tr key={unit.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{unit.title}</p>
                      <p className="font-mono text-[11px] text-muted">{unit.code}</p>
                      {unit.questionType && (
                        <p className="mt-0.5 text-xs text-muted">
                          Drill: {unit.questionType.replace(/_/g, " ")}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 capitalize text-muted sm:table-cell">
                      {formatUnitType(unit.type)}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{unit.questionCount}</td>
                    <td className="hidden px-4 py-3 md:table-cell">{unit.durationMin} min</td>
                    <td className="px-4 py-3 text-right">
                      {canStart ? (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={startingId === unit.id}
                          onClick={() => void onStart(unit)}
                        >
                          Start
                        </Button>
                      ) : (
                        <Link
                          href={shopHref}
                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-navy hover:bg-slate-50"
                        >
                          View packages
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

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
    <div className="space-y-10">
      <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-navy">AI Writing Coach</h2>
            <p className="mt-1 text-sm text-muted">
              Write Task 1 or Task 2 essays section by section, then get instant AI
              improvements. Each AI review uses one included attempt.
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
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
          >
            <PenLine className="h-4 w-4" />
            Open writing coach
          </Link>
          {writingRemaining === 0 && (
            <Link
              href={shopHref}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-slate-50"
            >
              <ShoppingBag className="h-4 w-4" />
              View packages
            </Link>
          )}
        </div>
      </section>

      <WritingPromptsSection
        title="Task 1 prompts"
        description="Academic Task 1 — charts, graphs, and diagrams."
        prompts={task1Prompts}
        startingPromptId={startingPromptId}
        onStart={onStartPrompt}
      />

      <WritingPromptsSection
        title="Task 2 prompts"
        description="Essay tasks — opinion, discussion, and problem/solution."
        prompts={task2Prompts}
        startingPromptId={startingPromptId}
        onStart={onStartPrompt}
      />

      {sessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-navy">Your writing sessions</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Prompt</th>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 8).map((session) => (
                  <tr key={session.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-navy">
                      {session.prompt?.title ?? session.sessionCode}
                    </td>
                    <td className="px-4 py-3">Task {session.taskNumber}</td>
                    <td className="px-4 py-3 capitalize">{session.status}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`${basePath}/writing/${session.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline"
                      >
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function WritingPromptsSection({
  title,
  description,
  prompts,
  startingPromptId,
  onStart,
}: {
  title: string;
  description: string;
  prompts: Awaited<ReturnType<typeof getWritingPrompts>>;
  startingPromptId: string | null;
  onStart: (promptId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-navy">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      {prompts.length === 0 ? (
        <EmptyPanel message="No published prompts yet." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Prompt</th>
                <th className="hidden px-4 py-3 sm:table-cell">Min words</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((prompt) => (
                <tr key={prompt.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{prompt.title}</p>
                    <p className="font-mono text-[11px] text-muted">{prompt.code}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">{prompt.minWords}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={startingPromptId === prompt.id}
                      onClick={() => void onStart(prompt.id)}
                    >
                      Start essay
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
    <section className="space-y-3 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-semibold text-navy">Recent attempts</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Practice unit</th>
              <th className="hidden px-4 py-3 sm:table-cell">Skill</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden px-4 py-3 md:table-cell">Score</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {attempts.slice(0, 8).map((attempt) => (
              <tr key={attempt.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-navy">{attempt.unit.title}</td>
                <td className="hidden px-4 py-3 capitalize sm:table-cell">
                  {attempt.unit.skill}
                </td>
                <td className="px-4 py-3">{formatAttemptStatus(attempt.status)}</td>
                <td className="hidden px-4 py-3 md:table-cell">
                  {attempt.score?.band != null
                    ? `Band ${attempt.score.band}`
                    : attempt.score?.rawScore != null
                      ? `${attempt.score.rawScore}/${attempt.score.totalQuestions ?? "?"}`
                      : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`${basePath}/attempt/${attempt.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline"
                  >
                    {attempt.status === "completed" ? "View" : "Continue"}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-muted">
      {message}
    </div>
  );
}
