"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, PenLine, ShoppingBag } from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import {
  getPracticeAttempts,
  getPracticeLibrary,
  getPracticeWallet,
  startPracticeAttempt,
  type PracticeAttemptSummary,
  type PracticeLibraryUnit,
  type PracticeWallet,
} from "@/lib/api/practice";

type Props = {
  basePath: string;
};

const CREDIT_LABELS: Record<string, string> = {
  readingPassages: "Reading passages",
  readingQuestionTypes: "Reading Q types",
  listeningSections: "Listening sections",
  listeningQuestionTypes: "Listening Q types",
  aiWritingEssays: "AI writing essays",
};

export function PracticeHubView({ basePath }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<PracticeWallet | null>(null);
  const [library, setLibrary] = useState<PracticeLibraryUnit[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttemptSummary[]>([]);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      getPracticeWallet(),
      getPracticeLibrary(),
      getPracticeAttempts(),
    ])
      .then(([w, lib, att]) => {
        setWallet(w);
        setLibrary(lib);
        setAttempts(att);
      })
      .catch(() => setError("Failed to load practice hub"))
      .finally(() => setLoading(false));
  }, []);

  async function handleStart(unitId: string) {
    setStartingId(unitId);
    try {
      const result = await startPracticeAttempt(unitId);
      window.location.href = `${basePath}/attempt/${result.attempt.id}`;
    } finally {
      setStartingId(null);
    }
  }

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="mx-auto max-w-5xl space-y-8 p-4 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Practice Hub</h1>
            <p className="mt-1 text-sm text-muted">
              Spend credits on reading, listening drills, or AI writing coaching.
            </p>
          </div>
          <Link
            href={`${basePath}/shop`}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white"
          >
            <ShoppingBag className="h-4 w-4" />
            Buy credits
          </Link>
        </div>

        {wallet && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(CREDIT_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold text-navy">
                  {wallet[key as keyof PracticeWallet]}
                </p>
              </div>
            ))}
          </div>
        )}

        <section>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-navy" />
            <h2 className="text-lg font-semibold text-navy">Practice library</h2>
          </div>
          <div className="grid gap-3">
            {library.map((unit) => (
              <div
                key={unit.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium text-navy">{unit.title}</p>
                  <p className="text-xs text-muted">
                    {unit.skill} · {unit.type.replace(/_/g, " ")} ·{" "}
                    {unit.questionCount} questions · {unit.durationMin} min
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={startingId === unit.id}
                  onClick={() => void handleStart(unit.id)}
                >
                  Start (1 credit)
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-navy" />
              <h2 className="text-lg font-semibold text-navy">AI Writing Coach</h2>
            </div>
            <Link
              href={`${basePath}/writing`}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy hover:bg-slate-50"
            >
              Open writing coach
            </Link>
          </div>
        </section>

        {attempts.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-navy">Recent attempts</h2>
            <div className="space-y-2">
              {attempts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                >
                  {a.unit.title} — {a.status}
                  {a.score?.band != null && ` · Band ${a.score.band}`}
                  {a.score?.rawScore != null &&
                    ` · ${a.score.rawScore}/${a.score.totalQuestions ?? "?"}`}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ApiDataShell>
  );
}
