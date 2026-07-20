import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { PracticeOfferingSection } from "@/components/marketing/shared/practice-offering-section";
import { PracticeCtaButton } from "@/components/marketing/shared/practice-cta-button";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { FaqAccordion } from "@/components/marketing/shared/faq-accordion";
import { PRODUCT_CLAIMS, MARKETING_FAQS } from "@/lib/marketing/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Practice Tests — Reading, Listening & AI Writing Packages",
  description:
    "Buy iTestU practice subscriptions anytime — Reading and Listening drills plus AI Writing reviews. Flexible credits between full mock exams.",
  alternates: { canonical: "/practice" },
};

const COMPARE: Array<[string, boolean, boolean]> = [
  ["Full 4-skill mock in one day", true, false],
  ["Certified examiner for Writing & Speaking", true, false],
  ["Flexible credits — use anytime", false, true],
  ["Reading & Listening auto-scored drills", false, true],
  ["Question-type focused drills", false, true],
  ["AI Writing essay reviews", false, true],
  ["Score progression across mocks", true, false],
];

const STEPS = [
  {
    n: "01",
    title: "Create a student account",
    body: "Register free — no mock booking required to start practice.",
    accent: "bg-sky-50 text-sky-600",
  },
  {
    n: "02",
    title: "Choose a practice package",
    body: "Pick credits for passages, sections, drills, or AI Writing reviews in the Practice shop.",
    accent: "bg-violet-50 text-violet-600",
  },
  {
    n: "03",
    title: "Drill on your schedule",
    body: "Open the Practice hub, spend credits when you are ready, and track attempts in your dashboard.",
    accent: "bg-emerald-50 text-emerald-600",
  },
];

function Cell({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-slate-300" />
  );
}

const PRACTICE_FAQS = MARKETING_FAQS.filter((f) => f.category === "Practice");

export default function PracticePage() {
  return (
    <>
      <PageHero
        eyebrow="Practice Tests"
        title="Subscription-style practice between mocks"
        subtitle={PRODUCT_CLAIMS.practice}
      >
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <PracticeCtaButton variant="primary" size="lg" withArrow />
          <CtaButton href="/mock-exams" variant="secondary" size="lg">
            Book a full mock instead
          </CtaButton>
        </div>
      </PageHero>

      <PracticeOfferingSection showHeading={false} className="pt-12" />

      <Section className="bg-slate-50 pt-0">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Mock vs Practice"
            title="Two products, one platform"
            subtitle={PRODUCT_CLAIMS.practiceVsMock}
          />
        </Reveal>
        <Reveal className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                <th className="px-4 py-3.5 sm:px-6">Feature</th>
                <th className="px-3 py-3.5 text-center">Full mock</th>
                <th className="px-3 py-3.5 text-center">Practice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARE.map((row, i) => (
                <tr key={row[0]} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="px-4 py-3 font-medium text-foreground sm:px-6">{row[0]}</td>
                  <td className="px-3 py-3">
                    <Cell value={row[1]} />
                  </td>
                  <td className="px-3 py-3">
                    <Cell value={row[2]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <SectionHeading align="center" eyebrow="How it works" title="Three steps to start practicing" />
        </Reveal>
        <Stagger className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <StaggerItem key={s.n} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", s.accent)}>
                {s.n}
              </span>
              <h3 className="mt-4 font-bold text-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section className="bg-white pt-0">
        <Reveal>
          <SectionHeading align="center" eyebrow="Practice FAQ" title="Common questions" />
        </Reveal>
        <div className="mx-auto mt-10 max-w-3xl">
          <FaqAccordion faqs={PRACTICE_FAQS} defaultOpenId="practice" />
        </div>
      </Section>

      <FinalCta
        title="Start with practice or go straight to a mock"
        subtitle="Many candidates buy practice credits first, then book a full mock when they are ready for examiner feedback."
        primaryLabel="Browse mock exams"
        secondaryPractice
        secondaryLabel="Create account for practice"
      />
    </>
  );
}
