import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Headphones,
  Mic,
  PenLine,
} from "lucide-react";
import { useStudentResultsData } from "@/contexts/student-results-context";
import { formatBandDisplay, type SkillId } from "@/lib/api/mappers/student";
import { cn } from "@/lib/utils";

const skillConfig: Record<
  SkillId,
  { icon: typeof Headphones; iconBg: string; bar: string }
> = {
  listening: { icon: Headphones, iconBg: "bg-sky-500/20 text-sky-300", bar: "bg-sky-400" },
  reading: { icon: BookOpen, iconBg: "bg-emerald-500/20 text-emerald-300", bar: "bg-emerald-400" },
  writing: { icon: PenLine, iconBg: "bg-violet-500/20 text-violet-300", bar: "bg-violet-400" },
  speaking: { icon: Mic, iconBg: "bg-rose-500/20 text-rose-300", bar: "bg-rose-400" },
};

function OverallGauge({ band, partial = false }: { band: number; partial?: boolean }) {
  const pct = band / 9;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={partial ? "#fbbf24" : "#38bdf8"}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black text-white" style={{ fontSize: "40px", lineHeight: 1 }}>
          {formatBandDisplay(band)}
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
          {partial ? "Partial" : "Overall"}
        </span>
      </div>
    </div>
  );
}

export function OverallScoreCard() {
  const { data } = useStudentResultsData();
  if (!data?.released && !data?.partial) return null;

  const {
    overallBand,
    bandLabel: bandLabelText,
    targetBand,
    targetAchieved,
    improvement,
    examType,
    dateLabel,
    skills,
    mockId,
    examFormat,
    partial,
    message,
  } = data;

  const packageTitle = data.title.split(" — ")[0] ?? data.title;
  const scoredCount = skills.filter((s) => s.band != null).length;
  const showOverall = data.released || (partial && scoredCount > 0);
  const examinerInfo = [
    { label: "Exam Number", value: mockId },
    { label: "Exam Format", value: examFormat },
    { label: "Package", value: packageTitle },
    { label: "Exam Type", value: examType },
  ];

  return (
    <div
      className="overflow-hidden rounded-2xl p-6 shadow-lg sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, #0a1628 0%, #1B2A4A 55%, #1e3a70 100%)",
      }}
    >
      <div className="flex flex-col gap-8 xl:flex-row xl:items-stretch xl:justify-between">
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {showOverall ? (
              <OverallGauge band={overallBand} partial={!!partial} />
            ) : (
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
                <div className="flex flex-col items-center justify-center px-3 text-center">
                  <span className="text-sm font-bold uppercase tracking-wider text-white/50">
                    Pending
                  </span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                    Overall
                  </span>
                </div>
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-black text-white" style={{ fontSize: "26px", letterSpacing: "-0.02em" }}>
                  {bandLabelText}
                </h2>
                {partial && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-200">
                    Partial release
                  </span>
                )}
                {targetAchieved && targetBand != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Target {formatBandDisplay(targetBand)} Achieved
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="flex items-center gap-1.5 text-sm text-white/70">
                  <CalendarDays className="h-4 w-4" />
                  {dateLabel} · {examType}
                </p>
                {improvement > 0 && (
                  <p className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
                    <ArrowUpRight className="h-4 w-4" />+{improvement} from previous attempt
                  </p>
                )}
              </div>
              {partial && message && (
                <p className="mt-2 max-w-xl text-sm text-amber-100/80">{message}</p>
              )}
            </div>
          </div>

          <div
            className={cn(
              "grid gap-3",
              skills.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
            )}
          >
            {skills.map((skill) => {
              const config = skillConfig[skill.id];
              const Icon = config.icon;
              const barPct =
                skill.band != null ? (skill.band / 9) * 100 : 0;
              return (
                <div
                  key={skill.id}
                  className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        config.iconBg,
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    {skill.delta > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400">
                        <ArrowUpRight className="h-3 w-3" />+{skill.delta}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-3 font-black",
                      skill.pending ? "text-white/40" : "text-white",
                    )}
                    style={{ fontSize: "24px", lineHeight: 1 }}
                  >
                    {formatBandDisplay(skill.band, skill.pending)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-white/55">{skill.name}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        skill.pending ? "bg-white/20" : config.bar,
                      )}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-6 xl:max-w-[220px] xl:grid-cols-1 xl:gap-y-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          {examinerInfo.map((item) => (
            <div key={item.label}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300/80">
                {item.label}
              </p>
              <p className="mt-1 font-semibold text-white" style={{ fontSize: "14px" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
