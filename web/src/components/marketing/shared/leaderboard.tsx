import Link from "next/link";
import { Crown, TrendingUp, ArrowRight } from "lucide-react";
import type { TopStudent } from "@/lib/marketing/data";
import { ACCENT } from "@/components/marketing/ui/accents";
import { Avatar } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

const SKILL_LETTERS: Array<[keyof TopStudent["skillBands"], string, string]> = [
  ["listening", "L", "text-sky-600"],
  ["reading", "R", "text-emerald-600"],
  ["writing", "W", "text-violet-600"],
  ["speaking", "S", "text-rose-600"],
];

function SkillBands({
  bands,
  align = "center",
}: {
  bands: TopStudent["skillBands"];
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "grid w-[7.5rem] grid-cols-4 gap-0.5 text-[11px] tabular-nums",
        align === "center" && "mx-auto",
      )}
    >
      {SKILL_LETTERS.map(([key, letter, color]) => (
        <div key={key} className="flex flex-col items-center">
          <span className={cn("font-bold leading-none", color)}>{letter}</span>
          <span className="mt-0.5 font-semibold leading-none text-foreground">
            {bands[key]}
          </span>
        </div>
      ))}
    </div>
  );
}

function PodiumCard({ student, place }: { student: TopStudent; place: 1 | 2 | 3 }) {
  const accent = ACCENT[student.accent];
  const heights = { 1: "h-16", 2: "h-12", 3: "h-10" };
  const orderClass = { 1: "order-2", 2: "order-1", 3: "order-3" };

  return (
    <div className={cn("flex w-full flex-col items-center", orderClass[place])}>
      <div
        className={cn(
          "w-full rounded-2xl border bg-white p-4 text-center shadow-sm",
          place === 1 ? "border-amber-200 ring-1 ring-amber-200 shadow-lg" : "border-border",
        )}
      >
        <div className="relative mx-auto w-fit">
          {place === 1 ? (
            <Crown className="absolute -top-4 left-1/2 h-5 w-5 -translate-x-1/2 fill-amber-400 text-amber-400" />
          ) : null}
          <Avatar initials={student.initials} size="md" className={cn("mx-auto", accent.iconBg)} />
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-navy">{student.name}</p>
        <p className="text-[11px] text-muted">{student.country}</p>
        <p className="mt-2 text-3xl font-extrabold text-emerald-600">{student.overallBand}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted">Overall Band</p>
        <div className="mt-2 border-t border-border pt-2">
          <SkillBands bands={student.skillBands} />
        </div>
      </div>
      <div
        className={cn(
          "mt-2 flex w-full items-center justify-center rounded-xl font-bold",
          heights[place],
          place === 1 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500",
        )}
      >
        #{place}
      </div>
    </div>
  );
}

export function Leaderboard({ students = [] }: { students?: TopStudent[] }) {
  if (students.length < 3) return null;

  const [first, second, third, ...rest] = students;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      {/* Podium */}
      <Reveal direction="left">
        <div className="grid grid-cols-3 items-end gap-3">
          <PodiumCard student={second} place={2} />
          <PodiumCard student={first} place={1} />
          <PodiumCard student={third} place={3} />
        </div>
      </Reveal>

      {/* Ranked list */}
      <Stagger className="flex flex-col gap-3">
        {rest.map((student) => {
          const accent = ACCENT[student.accent];
          return (
            <StaggerItem
              key={student.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-white px-4 py-3.5 shadow-sm"
            >
              <span className="text-sm font-bold text-slate-400">#{student.rank}</span>
              <Avatar initials={student.initials} size="sm" className={accent.iconBg} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">
                  {student.name}{" "}
                  <span className="font-normal text-muted">{student.country}</span>
                </p>
                <SkillBands bands={student.skillBands} align="left" />
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-emerald-600">{student.overallBand}</p>
                <p className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                  {student.improvementDelta > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3" /> +{student.improvementDelta}
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </p>
              </div>
            </StaggerItem>
          );
        })}
        <Link
          href="/mock-exams"
          className="mt-1 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3.5 text-sm font-semibold text-navy transition-colors hover:bg-white"
        >
          See your name here — Book a mock <ArrowRight className="h-4 w-4" />
        </Link>
      </Stagger>
    </div>
  );
}
