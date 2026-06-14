"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Mic, User } from "lucide-react";
import type { SpeakingContent } from "@/lib/exam/types";
import { ExamInterstitialHeader } from "@/components/exam/flow/exam-interstitial-header";
import { useExamContent } from "@/hooks/use-exam-content";
import { ApiDataShell } from "@/components/shared/api-data-shell";

export function WaitingSpeakingView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { content, loading, error } = useExamContent<SpeakingContent>(
    sessionId,
    "speaking",
  );

  if (loading || !content) {
    return <ApiDataShell loading={loading} error={error} />;
  }

  return (
    <>
      <ExamInterstitialHeader sessionId={sessionId} label="Mock progress" />
      <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-navy">
              Writing submitted
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              You have completed the computer-delivered sections. Your final
              section is the live Speaking interview.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-4 gap-2">
            {[
              { k: "Listening", done: true },
              { k: "Reading", done: true },
              { k: "Writing", done: true },
              { k: "Speaking", done: false },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-xl border border-slate-200 bg-white p-3 text-center"
              >
                <span
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold ${
                    s.done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {s.done ? <CheckCircle2 size={16} /> : "S"}
                </span>
                <p className="mt-1.5 text-[12px] font-medium text-slate-600">
                  {s.k}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border-2 border-rose-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white">
                <Mic size={18} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-slate-900">
                  Speaking interview
                </p>
                <p className="text-[12px] text-slate-500">
                  1-on-1 live session · Parts 1, 2 & 3
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-[13px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-slate-400" /> {content.examiner}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" /> {content.slot}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push(`/exam/${sessionId}/speaking`)}
              className="rounded-xl bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-brand-red-hover"
            >
              Enter Speaking waiting room
            </button>
            <button
              type="button"
              onClick={() => router.push("/student/mock-day")}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Mock Day Hub
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
