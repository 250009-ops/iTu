"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Headphones,
  Info,
  Mic,
  PenLine,
} from "lucide-react";
import { useStudentResultsData } from "@/contexts/student-results-context";
import {
  formatBandDisplay,
  type ModulePart,
  type PartTone,
  type SkillId,
} from "@/lib/api/mappers/student";
import { cn } from "@/lib/utils";

type WritingSubTab = "overall" | "task1" | "task2";

const skillMeta: Record<
  SkillId,
  { icon: typeof Headphones; active: string; bar: string }
> = {
  listening: { icon: Headphones, active: "border-sky-500 text-sky-600", bar: "bg-sky-500" },
  reading: { icon: BookOpen, active: "border-emerald-500 text-emerald-600", bar: "bg-emerald-500" },
  writing: { icon: PenLine, active: "border-violet-500 text-violet-600", bar: "bg-violet-500" },
  speaking: { icon: Mic, active: "border-rose-500 text-rose-600", bar: "bg-rose-500" },
};

const toneStyles: Record<PartTone, { pill: string; bar: string }> = {
  emerald: { pill: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  amber: { pill: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
  rose: { pill: "bg-rose-50 text-rose-700", bar: "bg-rose-500" },
  sky: { pill: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
};

function CriterionCard({ part, index }: { part: ModulePart; index: number }) {
  const tone = toneStyles[part.tagTone];
  return (
    <div
      key={`${part.sublabel}-${part.label}-${index}`}
      className="flex h-full flex-col rounded-xl border border-gray-100 p-4"
    >
      <div className="flex min-h-[3.25rem] items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-900" style={{ fontSize: "13px" }}>
            {part.label}
          </p>
          <p className="text-gray-400" style={{ fontSize: "11px" }}>
            {part.sublabel}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
            tone.pill,
          )}
        >
          {part.tag}
        </span>
      </div>
      <div className="mt-auto pt-3">
        <p className="font-black text-gray-900" style={{ fontSize: "20px" }}>
          {formatBandDisplay(part.value)}
          <span className="text-gray-400" style={{ fontSize: "13px" }}>
            /{part.max}
          </span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn("h-full rounded-full", tone.bar)}
            style={{ width: `${(part.value / part.max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CriterionGrid({ parts }: { parts: ModulePart[] }) {
  return (
    <div className="mt-5 grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4">
      {parts.map((part, index) => (
        <CriterionCard key={`${part.sublabel}-${part.label}-${index}`} part={part} index={index} />
      ))}
    </div>
  );
}

export function ModuleBreakdown() {
  const { data } = useStudentResultsData();
  const [active, setActive] = useState<SkillId | null>(null);
  const [writingTab, setWritingTab] = useState<WritingSubTab>("overall");

  useEffect(() => {
    if (!data?.skills.length) return;
    setActive((current) =>
      current && data.skills.some((s) => s.id === current)
        ? current
        : data.skills[0]!.id,
    );
  }, [data?.skills, data?.selectedEnrollmentCode]);

  useEffect(() => {
    setWritingTab("overall");
  }, [active, data?.selectedEnrollmentCode]);

  if (!data?.released || !active) return null;

  const detail = data.moduleDetails[active];
  if (!detail) return null;

  const activeMeta = skillMeta[active];
  const writingTasks = detail.writingTasks;
  const isWritingWithTasks = active === "writing" && writingTasks;

  const headerBand =
    isWritingWithTasks && writingTab === "task1"
      ? writingTasks.task1.band
      : isWritingWithTasks && writingTab === "task2"
        ? writingTasks.task2.band
        : detail.band;

  const headerBandLabel =
    isWritingWithTasks && writingTab === "task1"
      ? "Task 1 Band"
      : isWritingWithTasks && writingTab === "task2"
        ? "Task 2 Band"
        : detail.pending
          ? "Awaiting score"
          : "Band Score";

  const improvementFocus =
    isWritingWithTasks && writingTab === "task1" && writingTasks.task1.feedback
      ? writingTasks.task1.feedback
      : isWritingWithTasks && writingTab === "task2" && writingTasks.task2.feedback
        ? writingTasks.task2.feedback
        : detail.focus;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap gap-1 border-b border-gray-100 px-2 sm:px-4">
        {data.skills.map((skill) => {
          const meta = skillMeta[skill.id];
          const Icon = meta.icon;
          const isActive = active === skill.id;
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => setActive(skill.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3.5 font-semibold transition-colors",
                isActive
                  ? meta.active
                  : "border-transparent text-gray-400 hover:text-gray-600",
              )}
              style={{ fontSize: "14px" }}
            >
              <Icon size={16} />
              {skill.name}
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-bold",
                  isActive ? "bg-gray-100 text-gray-700" : "text-gray-400",
                  skill.pending && "text-amber-600",
                )}
              >
                {formatBandDisplay(skill.band, skill.pending)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {activeMeta ? `${data.skills.find((s) => s.id === active)?.name ?? active} Module` : "Module"}
            </p>
            <p className="mt-1 max-w-xl text-gray-600" style={{ fontSize: "14px" }}>
              {detail.summary}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "font-black",
                detail.pending ? "text-gray-300" : activeMeta.active.split(" ")[1],
              )}
              style={{ fontSize: "34px", lineHeight: 1 }}
            >
              {formatBandDisplay(headerBand, detail.pending)}
            </p>
            <p className="text-xs text-gray-400">{headerBandLabel}</p>
          </div>
        </div>

        {isWritingWithTasks ? (
          <>
            <div className="mt-5 flex flex-wrap gap-1 border-b border-gray-100">
              {(
                [
                  ["overall", "Overall", detail.band],
                  ["task1", "Task 1", writingTasks.task1.band],
                  ["task2", "Task 2", writingTasks.task2.band],
                ] as const
              ).map(([tab, label, band]) => {
                const isTabActive = writingTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setWritingTab(tab)}
                    className={cn(
                      "flex items-center gap-2 border-b-2 px-3 py-2.5 font-semibold transition-colors",
                      isTabActive
                        ? "border-violet-500 text-violet-600"
                        : "border-transparent text-gray-400 hover:text-gray-600",
                    )}
                    style={{ fontSize: "13px" }}
                  >
                    {label}
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-xs font-bold",
                        isTabActive ? "bg-violet-50 text-violet-700" : "text-gray-400",
                      )}
                    >
                      {formatBandDisplay(band)}
                    </span>
                  </button>
                );
              })}
            </div>

            {writingTab === "overall" ? (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    ["Task 1", writingTasks.task1],
                    ["Task 2", writingTasks.task2],
                  ] as const
                ).map(([label, task]) => {
                  const tone =
                    task.band != null && task.band >= 7
                      ? toneStyles.emerald
                      : task.band != null && task.band >= 6
                        ? toneStyles.amber
                        : toneStyles.rose;
                  return (
                    <div
                      key={label}
                      className="flex flex-col rounded-xl border border-gray-100 p-4"
                    >
                      <p className="font-bold text-gray-900" style={{ fontSize: "13px" }}>
                        {label}
                      </p>
                      <p className="text-gray-400" style={{ fontSize: "11px" }}>
                        Task band score
                      </p>
                      <p className="mt-3 font-black text-gray-900" style={{ fontSize: "20px" }}>
                        {formatBandDisplay(task.band)}
                        <span className="text-gray-400" style={{ fontSize: "13px" }}>
                          /9
                        </span>
                      </p>
                      {task.band != null ? (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn("h-full rounded-full", tone.bar)}
                            style={{ width: `${(task.band / 9) * 100}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : writingTab === "task1" && writingTasks.task1.parts.length > 0 ? (
              <CriterionGrid parts={writingTasks.task1.parts} />
            ) : writingTab === "task2" && writingTasks.task2.parts.length > 0 ? (
              <CriterionGrid parts={writingTasks.task2.parts} />
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                Criteria scores for this task will appear here once grading is complete.
              </div>
            )}
          </>
        ) : detail.parts.length > 0 ? (
          <CriterionGrid parts={detail.parts} />
        ) : detail.pending ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Scores for this module will appear here once grading is complete.
          </div>
        ) : null}

        <div className="mt-5 flex gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          <p className="text-sky-800" style={{ fontSize: "13px" }}>
            <span className="font-bold">Improvement focus:</span> {improvementFocus}
          </p>
        </div>
      </div>
    </div>
  );
}
