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
  getPracticeAttempts,
  getPracticeLibrary,
  getPracticeWallet,
  getWritingPrompts,
  getWritingSessions,
  startPracticeAttempt,
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
  totalPracticeCredits,
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
  const [wallet, setWallet] = useState<PracticeWallet | null>(null);
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

  useEffect(() => {
    void Promise.all([
      getPracticeWallet(),
      getPracticeLibrary(),
      getPracticeAttempts(),
      getWritingPrompts(),
      getWritingSessions(),
    ])
      .then(([w, lib, att, pr, sessions]) => {
        setWallet(w);
        setLibrary(lib);
        setAttempts(att);
        setPrompts(pr);
        setWritingSessions(sessions);
      })
      .catch(() => setError("Failed to load practice hub"))
      .finally(() => setLoading(false));
  }, []);

  const totalCredits = wallet ? totalPracticeCredits(wallet) : 0;
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
    if (wallet && !hasCreditsForUnit(wallet, unit)) {
      toast("Not enough credits", {
        description: "Buy a practice bundle to start this unit.",
        variant: "warning",
      });
      return;
    }

    setStartingId(unit.id);
    try {
      const result = await startPracticeAttempt(unit.id);
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
              your writing. Each activity uses one credit from your wallet.
            </p>
          </div>
          <Link
            href={`${basePath}/shop`}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90"
          >
            <ShoppingBag className="h-4 w-4" />
            Buy credits
          </Link>
        </header>

        {wallet && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-navy">Your wallet</h2>
                <p className="text-xs text-muted">
                  {totalCredits > 0
                    ? `${totalCredits} credit${totalCredits === 1 ? "" : "s"} available`
                    : "No credits yet — purchase a bundle to get started"}
                </p>
              </div>
              {totalCredits === 0 && (
                <Link
                  href={`${basePath}/shop`}
                  className="text-sm font-medium text-brand-red hover:underline"
                >
                  View bundles
                </Link>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(PRACTICE_CREDIT_META) as (keyof PracticeWallet)[]).map(
                (key) => {
                  const meta = PRACTICE_CREDIT_META[key];
                  const balance = wallet[key];
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
                      <p className="mt-0.5 text-[11px] text-muted">{meta.label}</p>
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
            wallet={wallet}
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
                wallet={wallet}
                startingId={startingId}
                shopHref={`${basePath}/shop`}
                onStart={handleStartUnit}
              />
            ))}
          </div>
        )}

        <RecentAttemptsSection attempts={attempts} basePath={basePath} />
      </div>
    </ApiDataShell>
  );
}

function LibrarySection({
  section,
  units,
  wallet,
  startingId,
  shopHref,
  onStart,
}: {
  section: (typeof PRACTICE_LIBRARY_SECTIONS)[number];
  units: PracticeLibraryUnit[];
  wallet: PracticeWallet | null;
  startingId: string | null;
  shopHref: string;
  onStart: (unit: PracticeLibraryUnit) => void;
}) {
  const credits = wallet?.[section.creditKey] ?? 0;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-navy">{section.title}</h2>
        <p className="mt-0.5 text-sm text-muted">{section.description}</p>
        <p className="mt-1 text-xs text-muted">
          You have{" "}
          <span className="font-semibold text-navy">{credits}</span> credit
          {credits === 1 ? "" : "s"} for this category.
        </p>
      </div>

      {units.length === 0 ? (
        <EmptyPanel message="No published content in this category yet. Your centre admin can publish practice units from Content Studio." />
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
                const canStart = wallet ? hasCreditsForUnit(wallet, unit) : false;
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
                          Get credits
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
  wallet,
  task1Prompts,
  task2Prompts,
  sessions,
  startingPromptId,
  onStartPrompt,
}: {
  basePath: string;
  wallet: PracticeWallet | null;
  task1Prompts: Awaited<ReturnType<typeof getWritingPrompts>>;
  task2Prompts: Awaited<ReturnType<typeof getWritingPrompts>>;
  sessions: WritingPracticeSession[];
  startingPromptId: string | null;
  onStartPrompt: (promptId: string) => void;
}) {
  const writingCredits = wallet?.aiWritingEssays ?? 0;
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
              improvements. One essay review uses 1 writing credit.
            </p>
            <p className="mt-2 text-xs text-muted">
              AI feedback credits:{" "}
              <span className="font-semibold text-navy">{writingCredits}</span>
              {writingCredits === 0 && " — you can still draft essays; buy credits before requesting feedback"}
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
          {writingCredits === 0 && (
            <Link
              href={shopHref}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-slate-50"
            >
              <ShoppingBag className="h-4 w-4" />
              Buy writing credits
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
