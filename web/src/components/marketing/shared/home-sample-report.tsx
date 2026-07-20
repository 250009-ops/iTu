import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PRODUCT_CLAIMS } from "@/lib/marketing/data";
import { Section, SectionHeading } from "@/components/marketing/ui/primitives";
import { Reveal } from "@/components/marketing/motion/reveal";

const SKILL_BARS: Array<[string, number, string, string]> = [
  ["Listening", 9, "text-sky-600", "bg-sky-500"],
  ["Reading", 8.5, "text-emerald-600", "bg-emerald-500"],
  ["Writing", 8, "text-violet-600", "bg-violet-500"],
  ["Speaking", 8.5, "text-rose-600", "bg-rose-500"],
];

export function HomeSampleReport() {
  return (
    <Section>
      <Reveal>
        <SectionHeading
          eyebrow="Sample Report"
          title="See exactly what you get"
          subtitle="Criteria-level feedback from a real examiner, not an algorithm."
        />
      </Reveal>
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        <Reveal direction="left">
          <div className="overflow-hidden rounded-2xl border border-border shadow-md">
            <div className="bg-navy p-6 text-white sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Full Academic Mock
                  </p>
                  <p className="text-sm text-slate-300">Sample candidate · June 2026</p>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Released
                </span>
              </div>
              <div className="mt-5">
                <p className="text-5xl font-extrabold text-emerald-400">8.5</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">Overall Band</p>
              </div>
            </div>
            <div className="space-y-4 bg-white p-6">
              {SKILL_BARS.map(([label, band, textClass, barClass]) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className={`font-semibold ${textClass}`}>{label}</span>
                    <span className="font-bold text-navy">{band.toFixed(1)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${barClass}`}
                      style={{ width: `${(band / 9) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal direction="right">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h3 className="font-bold text-navy">Examiner feedback excerpt</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              &ldquo;Strong task response with clear overview in Task 1. In Speaking Part 3,
              extend answers with more complex structures — conditionals and passive voice
              would push this to Band 9.&rdquo;
            </p>
            <p className="mt-4 text-sm text-muted">{PRODUCT_CLAIMS.resultsTiming}</p>
            <Link
              href="/results"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-brand-red"
            >
              Explore the full results experience <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
