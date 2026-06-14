import type { Metadata } from "next";
import { BadgeCheck, CalendarDays, PenLine, DollarSign, Check, Star } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { EarningsCalculator } from "@/components/marketing/shared/earnings-calculator";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { fetchHeroStats } from "@/lib/marketing/server-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Become an IELTS Examiner — Earn From Remote Grading",
  description:
    "Certified examiner? Join a network of professionals earning from flexible, fully remote IELTS Writing grading and live Speaking sessions. Set your own schedule, get paid weekly.",
  alternates: { canonical: "/for-teachers" },
};

const STEPS = [
  { n: "Step 01", icon: BadgeCheck, title: "Apply & verify", body: "Submit your CELTA/DELTA credentials and complete a short grading calibration. Our team verifies all examiners before they go live.", accent: "bg-sky-50 text-sky-600" },
  { n: "Step 02", icon: CalendarDays, title: "Set your availability", body: "Mark the days and times you're available. You control how many sessions you take — grade 5 tasks a week or 50.", accent: "bg-violet-50 text-violet-600" },
  { n: "Step 03", icon: PenLine, title: "Grade & conduct", body: "Writing tasks arrive in your queue as PDFs. Speaking slots are booked by students who select you by name.", accent: "bg-rose-50 text-rose-600" },
  { n: "Step 04", icon: DollarSign, title: "Get paid weekly", body: "Transparent earnings dashboard. Payments processed every Monday for the previous week's work.", accent: "bg-emerald-50 text-emerald-600" },
];

const REQUIRED = [
  "CELTA, DELTA, or equivalent (e.g. PGCE with ELT)",
  "Experience assessing IELTS Writing or Speaking",
  "Stable internet connection (10 Mbps+ for Speaking)",
  "Quiet, professional environment for video sessions",
  "Availability for at least 5 sessions per week",
];

const PREFERRED = [
  "Current or former IDP/British Council certified examiner",
  "MA TESOL or Applied Linguistics",
  "Examiner calibration training (we provide this)",
  "Experience with band descriptor application",
  "Multi-lingual: especially Arabic, Mandarin, Hindi",
];

export default async function ForTeachersPage() {
  const stats = await fetchHeroStats();
  return (
    <>
      <PageHero
        eyebrow="For Examiners"
        title="Turn your expertise into income"
        subtitle={`Certified examiner? Join ${stats.examiners} professionals earning from flexible, fully remote IELTS grading and live Speaking sessions.`}
      >
        <CtaButton href="/contact" variant="primary" size="lg" withArrow className="mt-4">
          Apply to become an examiner
        </CtaButton>
      </PageHero>

      <Section className="pt-16">
        <Reveal>
          <SectionHeading eyebrow="How It Works" title="Grade from anywhere, on your schedule" />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <StaggerItem key={s.n} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", s.accent)}>
                <s.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{s.n}</p>
              <h3 className="mt-1 font-bold text-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section className="bg-white pt-0">
        <Reveal>
          <SectionHeading
            eyebrow="Earnings Calculator"
            title="Estimate your monthly income"
            subtitle="Adjust the sliders to reflect your expected workload. All rates are per session."
          />
        </Reveal>
        <Reveal className="mt-10">
          <EarningsCalculator />
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="Requirements"
            title="Who can apply?"
            subtitle="We accept examiners with verified IELTS-related qualifications. Here's what you need."
          />
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Reveal direction="left" className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-bold text-navy">
              <Check className="h-5 w-5 text-emerald-600" /> Required qualifications
            </h3>
            <ul className="mt-4 divide-y divide-border">
              {REQUIRED.map((r) => (
                <li key={r} className="flex items-start gap-2.5 py-2.5 text-sm text-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {r}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal direction="right" className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-bold text-navy">
              <Star className="h-5 w-5 text-amber-500" /> Preferred (not required)
            </h3>
            <ul className="mt-4 divide-y divide-border">
              {PREFERRED.map((p) => (
                <li key={p} className="flex items-start gap-2.5 py-2.5 text-sm text-muted">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      <FinalCta
        eyebrow="Join the team"
        title="Ready to start earning?"
        subtitle={`Join ${stats.examiners} certified examiners already on the platform. The application takes 10 minutes.`}
        primaryHref="/contact"
        primaryLabel="Apply to become an examiner"
      />
    </>
  );
}
