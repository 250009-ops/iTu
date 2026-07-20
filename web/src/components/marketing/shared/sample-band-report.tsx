import Link from "next/link";
import { MessageSquare, TrendingUp } from "lucide-react";
import { Reveal } from "@/components/marketing/motion/reveal";
import { SectionHeading } from "@/components/marketing/ui/primitives";

const SKILL_BARS: Array<[string, number, string, string]> = [
  ["Listening", 9, "text-sky-600", "bg-sky-500"],
  ["Reading", 8.5, "text-emerald-600", "bg-emerald-500"],
  ["Writing", 8, "text-violet-600", "bg-violet-500"],
  ["Speaking", 8.5, "text-rose-600", "bg-rose-500"],
];

const CRITERIA: Array<[string, number, string]> = [
  ["Task Achievement", 8, "bg-violet-500"],
  ["Coherence & Cohesion", 8, "bg-sky-500"],
  ["Lexical Resource", 8.5, "bg-emerald-500"],
  ["Grammatical Range & Acc.", 7.5, "bg-amber-500"],
];

const IMPROVEMENTS = [
  ["Writing Task 1 overview paragraph", "Synthesise key trends before listing data points."],
  ["Grammatical range — Speaking Part 3", "Use more complex structures: conditionals, passive voice."],
  ["Lexical resource — collocations", "Replace overused adjectives with precise collocations."],
];

type Props = {
  className?: string;
  compact?: boolean;
};

export function SampleBandReport({ className, compact = false }: Props) {
  return (
    <section className={className}>
      <Reveal>
        <SectionHeading
          eyebrow="Sample Report"
          title="See exactly what you get"
          subtitle="Criteria-level feedback from a real examiner, not an algorithm."
          align={compact ? "center" : "left"}
        />
      </Reveal>
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Reveal direction="left">
          <div className="overflow-hidden rounded-2xl border border-border shadow-md">
            <div className="bg-navy p-6 text-white sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Full Academic Mock
                  </p>
                  <p className="text-sm text-slate-300">Aisha Karimova · June 9, 2026</p>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Released
                </span>
              </div>
              <div className="mt-5 flex items-end gap-8">
                <div>
                  <p className="text-5xl font-extrabold text-emerald-400">8.5</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Overall Band</p>
                </div>
                <div className="grid flex-1 grid-cols-4 gap-3">
                  {SKILL_BARS.map(([name, band, , bar]) => (
                    <div key={name}>
                      <p className="text-[10px] text-slate-400">{name}</p>
                      <p className="text-lg font-bold text-white">{band}</p>
                      <span className="mt-1 block h-1 rounded-full bg-white/15">
                        <span
                          className={`block h-1 rounded-full ${bar}`}
                          style={{ width: `${(band / 9) * 100}%` }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Writing · Examiner feedback — Daniel Whitfield
              </p>
              <div className="mt-3 rounded-xl border border-l-4 border-violet-200 bg-violet-50/40 p-4">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600">
                  <MessageSquare className="h-3.5 w-3.5" /> Feedback
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                  &ldquo;Task 2 demonstrates sophisticated argument development with well-integrated
                  evidence. Lexical range is impressive — varied collocations used accurately. Task 1
                  would benefit from a stronger overview paragraph synthesising key trends before data
                  points.&rdquo;
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CRITERIA.map(([name, band, bar]) => (
                  <div key={name} className="rounded-xl border border-border p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted">{name}</p>
                    <p className="mt-1 text-xl font-bold text-navy">{band}</p>
                    <span className="mt-1 block h-1 rounded-full bg-slate-100">
                      <span
                        className={`block h-1 rounded-full ${bar}`}
                        style={{ width: `${(band / 9) * 100}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {!compact ? (
          <Reveal direction="right">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="inline-flex items-center gap-1.5 text-sm font-bold text-navy">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Improvement Opportunities
              </p>
              <ol className="mt-4 space-y-3">
                {IMPROVEMENTS.map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs leading-relaxed text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-center">
                <p className="text-sm font-bold text-navy">Targeting Band 9.0?</p>
                <p className="mt-1 text-xs text-muted">
                  Book another mock to track your progress after acting on your feedback.
                </p>
                <Link
                  href="/mock-exams"
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg bg-amber-500 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                >
                  Book next mock →
                </Link>
              </div>
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
