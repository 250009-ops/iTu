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
  type PartTone,
  type SkillId,
} from "@/lib/api/mappers/student";
import { cn } from "@/lib/utils";

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

export function ModuleBreakdown() {
  const { data } = useStudentResultsData();
  const [active, setActive] = useState<SkillId | null>(null);

  useEffect(() => {
    if (!data?.skills.length) return;
    setActive((current) =>
      current && data.skills.some((s) => s.id === current)
        ? current
        : data.skills[0]!.id,
    );
  }, [data?.skills, data?.selectedEnrollmentCode]);

  if (!data?.released || !active) return null;

  const detail = data.moduleDetails[active];
  if (!detail) return null;

  const activeMeta = skillMeta[active];

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
              {formatBandDisplay(detail.band, detail.pending)}
            </p>
            <p className="text-xs text-gray-400">
              {detail.pending ? "Awaiting score" : "Band Score"}
            </p>
          </div>
        </div>

        {detail.parts.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {detail.parts.map((part) => {
              const tone = toneStyles[part.tagTone];
              return (
                <div
                  key={part.label}
                  className="rounded-xl border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900" style={{ fontSize: "13px" }}>
                        {part.label}
                      </p>
                      <p className="text-gray-400" style={{ fontSize: "11px" }}>
                        {part.sublabel}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        tone.pill,
                      )}
                    >
                      {part.tag}
                    </span>
                  </div>
                  <p className="mt-3 font-black text-gray-900" style={{ fontSize: "20px" }}>
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
              );
            })}
          </div>
        ) : detail.pending ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Scores for this module will appear here once grading is complete.
          </div>
        ) : null}

        <div className="mt-5 flex gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          <p className="text-sky-800" style={{ fontSize: "13px" }}>
            <span className="font-bold">Improvement focus:</span> {detail.focus}
          </p>
        </div>
      </div>
    </div>
  );
}
