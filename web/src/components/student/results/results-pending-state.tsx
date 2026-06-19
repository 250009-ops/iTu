"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  Headphones,
  Loader2,
  Mic,
  PenLine,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsShellHeader } from "@/components/student/results/results-shell-header";
import {
  resultsHowItWorks,
  resultsPreviewSkills,
  resultsWhatYouGet,
} from "@/lib/student/results-preview";
import type { StudentResultsData } from "@/lib/api/mappers/student";

const skillIcons = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
} as const;

const navyGradient =
  "linear-gradient(135deg, #0a1628 0%, #1B2A4A 55%, #1e3a70 100%)";

export function ResultsPendingState({ data }: { data: StudentResultsData }) {
  return (
    <div className="min-h-full bg-gray-50/60">
      <ResultsShellHeader
        title={data.title}
        subtitle={data.subtitle}
        actions={
          <Link href="/student/mock-day">
            <Button variant="secondary" size="sm">
              Open Mock Day Hub
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6 lg:px-8 lg:py-8">
        <div
          className="overflow-hidden rounded-2xl p-6 shadow-lg sm:p-8"
          style={{ background: navyGradient }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
                <Clock size={14} />
                Grading in progress
              </span>
              <h2
                className="mt-4 font-black tracking-tight text-white"
                style={{ fontSize: "26px", letterSpacing: "-0.02em" }}
              >
                Your band report is being prepared
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-blue-200/90">
                {data.message ??
                  "Your results will appear here once all sections are graded and released together — typically within 24 hours of your Speaking test."}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/student/mock-day" className="inline-block">
                  <Button
                    size="lg"
                    className="bg-white text-navy hover:bg-slate-100"
                  >
                    Continue Mock
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href={`mailto:support@itestu.uz?subject=Results%20inquiry%20-%20${data.mockId}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-200/90 hover:text-white"
                >
                  <Headphones size={15} />
                  Contact support
                </a>
              </div>
            </div>

            <div className="flex h-32 w-32 shrink-0 flex-col items-center justify-center self-center rounded-full border-4 border-dashed border-white/20 bg-white/5">
              <Loader2 size={28} className="animate-spin text-white/50" />
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Grading
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 sm:grid-cols-4">
            {resultsPreviewSkills.map((skill) => {
              const Icon = skillIcons[skill.id];
              return (
                <div
                  key={skill.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-white/50" />
                    <span className="text-xs font-semibold text-white/80">
                      {skill.name}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-white/30">—</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-gray-100 bg-white opacity-90 shadow-sm">
              <div className="flex flex-wrap gap-1 border-b border-gray-100 px-2 sm:px-4">
                {resultsPreviewSkills.map((skill, index) => {
                  const Icon = skillIcons[skill.id];
                  return (
                    <div
                      key={skill.id}
                      className={`flex items-center gap-2 border-b-2 px-3 py-3.5 font-semibold ${
                        index === 0
                          ? "border-sky-500 text-sky-600"
                          : "border-transparent text-gray-400"
                      }`}
                      style={{ fontSize: "14px" }}
                    >
                      <Icon size={16} />
                      {skill.name}
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-400">
                        —
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Loader2 size={20} className="animate-spin text-gray-300" />
                <p className="mt-3 font-semibold text-gray-700">
                  Module breakdown is being graded
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  Detailed criteria scores and examiner feedback for each skill
                  unlock once your Writing and Speaking are graded.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 sm:px-6">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
                  All Attempts History
                </h3>
                <span className="ml-auto text-xs text-muted">Pending</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <th className="px-5 py-3 sm:px-6">Mock</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">L</th>
                      <th className="px-3 py-3">R</th>
                      <th className="px-3 py-3">W</th>
                      <th className="px-3 py-3">S</th>
                      <th className="px-3 py-3">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50">
                      <td className="px-5 py-4 font-semibold text-gray-700 sm:px-6">
                        {data.title}
                      </td>
                      <td className="px-3 py-4 text-gray-500">{data.dateLabel}</td>
                      <td className="px-3 py-4 text-gray-300">—</td>
                      <td className="px-3 py-4 text-gray-300">—</td>
                      <td className="px-3 py-4 text-gray-300">—</td>
                      <td className="px-3 py-4 text-gray-300">—</td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          <Clock size={11} />
                          Grading
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
                  Score Progression
                </h3>
              </div>
              <div className="mt-4 flex h-[190px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
                <p className="max-w-[200px] text-center text-xs text-muted">
                  Your band progression appears here once results are released
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-400" />
                <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
                  What you&apos;ll receive
                </h3>
              </div>
              <ul className="mt-4 space-y-2.5">
                {resultsWhatYouGet.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
                How results work
              </h3>
              <ol className="mt-4 space-y-4">
                {resultsHowItWorks.map((item) => (
                  <li key={item.step} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
