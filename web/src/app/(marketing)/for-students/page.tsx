import type { Metadata } from "next";
import { Award, Star, TrendingUp, Check, Minus } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { TestimonialCard } from "@/components/marketing/shared/testimonial-card";
import { StatsBand } from "@/components/marketing/shared/stats-band";
import { fetchStats, fetchTestimonials } from "@/lib/marketing/server-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "For Students — Prepare for IELTS the Way Professionals Do",
  description:
    "The only IELTS mock that runs on the same engine as the real computer-delivered test, with real certified examiners grading your Writing and Speaking. Real conditions, real feedback, real bands.",
  alternates: { canonical: "/for-students" },
};

const WHY = [
  { icon: Award, title: "Real exam conditions", body: "Server-authoritative audio, strict timers, single-screen rule. The pressure is real — so when you sit the actual test, nothing surprises you.", accent: "bg-sky-50 text-sky-600" },
  { icon: Star, title: "Real examiner feedback", body: "A certified examiner grades your Writing and Speaking against the official criteria. You'll know exactly which sub-scores to target next.", accent: "bg-violet-50 text-violet-600" },
  { icon: TrendingUp, title: "Real band progression", body: "Score history tracked across every mock. Watch your band rise as you act on feedback — and know when you're ready for the real test.", accent: "bg-emerald-50 text-emerald-600" },
];

const COMPARE: Array<[string, boolean, boolean, boolean]> = [
  ["Official CBT interface", true, false, false],
  ["Server-authoritative timers", true, false, false],
  ["Certified examiner grading", true, false, true],
  ["Criteria-level feedback", true, false, true],
  ["Same-day band results", true, false, false],
  ["Score progression tracking", true, false, false],
  ["Speaking via live video", true, false, true],
];

const STEPS = [
  { n: "01", title: "Book and choose your examiner", body: "Select Academic or General Training, pick your date, and browse certified examiners. Filter by speciality and rating. Secure checkout takes 60 seconds.", accent: "bg-sky-50 text-sky-600" },
  { n: "02", title: "Sit the full mock on your chosen day", body: "Check in from home 30 minutes before. Sit Listening → Reading → Writing. Then join your live Speaking session with your chosen examiner.", accent: "bg-violet-50 text-violet-600" },
  { n: "03", title: "Receive your band report same day", body: "All four bands released together once Speaking is graded. Read your examiner's written feedback. Focus your preparation on the areas flagged.", accent: "bg-emerald-50 text-emerald-600" },
];

function Cmp({ v }: { v: boolean }) {
  return v ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-slate-300" />
  );
}

export default async function ForStudentsPage() {
  const [testimonials, stats] = await Promise.all([fetchTestimonials(), fetchStats()]);
  return (
    <>
      <PageHero
        eyebrow="For Students"
        title="Prepare the way professionals do"
        subtitle="The only mock exam that runs on the same engine as the real computer-delivered test — with real certified examiners grading your Writing and Speaking."
      >
        <CtaButton href="/mock-exams" variant="primary" size="lg" withArrow className="mt-4">
          Book a Full Mock
        </CtaButton>
      </PageHero>

      <Section className="pt-16">
        <Reveal>
          <SectionHeading
            eyebrow="Why IELTS Mock"
            title="Not just another practice test"
            subtitle="Generic free tests don't replicate the pressure, format, or grading rigour of the real exam. We do."
          />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {WHY.map((c) => (
            <StaggerItem key={c.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", c.accent)}>
                <c.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section className="bg-white pt-0">
        <Reveal>
          <SectionHeading align="center" eyebrow="Comparison" title="How we compare" />
        </Reveal>
        <Reveal className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                <th className="px-4 py-3.5 sm:px-6">Feature</th>
                <th className="px-3 py-3.5 text-center text-emerald-300">IELTS Mock</th>
                <th className="px-3 py-3.5 text-center">Free online tests</th>
                <th className="px-3 py-3.5 text-center">Tutor practice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARE.map(([feat, a, b, c], i) => (
                <tr key={feat} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="px-4 py-3 font-medium text-foreground sm:px-6">{feat}</td>
                  <td className="px-3 py-3"><Cmp v={a} /></td>
                  <td className="px-3 py-3"><Cmp v={b} /></td>
                  <td className="px-3 py-3"><Cmp v={c} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <SectionHeading align="center" eyebrow="Getting Started" title="Three steps to your band score" />
        </Reveal>
        <Stagger className="mx-auto mt-12 max-w-3xl space-y-4">
          {STEPS.map((s) => (
            <StaggerItem key={s.n} className="flex gap-5 rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold", s.accent)}>
                {s.n}
              </span>
              <div>
                <h3 className="font-bold text-navy">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal className="mt-10 flex justify-center">
          <CtaButton href="/mock-exams" variant="primary" size="lg" withArrow>
            Book a Full Mock — 56,000 so'm
          </CtaButton>
        </Reveal>
      </Section>

      {testimonials.length > 0 && (
        <Section className="bg-white">
          <Reveal>
            <SectionHeading align="center" eyebrow="Candidate Stories" title="Results that speak for themselves" />
          </Reveal>
          <Stagger className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.slice(0, 3).map((item) => (
              <StaggerItem key={item.id}>
                <TestimonialCard item={item} />
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      )}

      <StatsBand stats={stats} />
    </>
  );
}
