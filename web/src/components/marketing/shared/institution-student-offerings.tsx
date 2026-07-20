import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Headphones, PenLine } from "lucide-react";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { INSTITUTION_COPY, PRACTICE_OFFERINGS } from "@/lib/marketing/data";
import { cn } from "@/lib/utils";

const MOCK_FEATURES = [
  "Bulk mock credits for cohort enrolments",
  "Mock schedule + live session monitor",
  "Centre band reports and skill breakdowns",
  "Optional B2B mock sets (Listening · Reading · Writing)",
] as const;

export function InstitutionStudentOfferingsSection() {
  return (
    <Section className="bg-slate-50">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="For your students"
          title={INSTITUTION_COPY.headline}
          subtitle={INSTITUTION_COPY.subtitle}
        />
      </Reveal>

      <Stagger className="mt-12 grid gap-6 lg:grid-cols-2">
        <StaggerItem className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-xl font-bold text-navy">Scheduled mock exams</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {INSTITUTION_COPY.mockEnrolments}
          </p>
          <ul className="mt-6 space-y-2.5">
            {MOCK_FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                {item}
              </li>
            ))}
          </ul>
        </StaggerItem>

        <StaggerItem className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white">
            <BookOpen className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-xl font-bold text-navy">Practice subscriptions</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {INSTITUTION_COPY.studentPractice}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {PRACTICE_OFFERINGS.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-xs font-semibold",
                  item.accent,
                )}
              >
                {item.title}
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <PenLine className="h-3.5 w-3.5 text-violet-600" /> AI Writing reviews included in
            practice packages
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted">
            <Headphones className="h-3.5 w-3.5 text-sky-600" /> Auto-scored Listening &amp; Reading
            drills
          </p>
        </StaggerItem>
      </Stagger>

      <Reveal className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <CtaButton href="#partner" variant="primary" withArrow>
          Partner as an Edu Center
        </CtaButton>
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 text-sm font-semibold text-navy underline-offset-4 hover:underline"
        >
          See how practice packages work <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </Section>
  );
}
