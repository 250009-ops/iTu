import type { Metadata } from "next";
import { ShieldCheck, Award, TrendingUp, Globe, CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { fetchHeroStats } from "@/lib/marketing/server-data";
import { SITE } from "@/lib/marketing/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About — Built by Exam Professionals",
  description:
    `${SITE.name} was founded in ${SITE.foundedYear} to give candidates access to the most realistic, most useful mock exam available anywhere. Built by former examiners and exam-infrastructure engineers.`,
  alternates: { canonical: "/about" },
};

const VALUES = [
  { icon: ShieldCheck, title: "Exam fidelity above all", body: "We will never make the test easier to flatter candidates. Realistic conditions are the whole point.", accent: "bg-sky-50 text-sky-600" },
  { icon: Award, title: "Examiner excellence", body: "Every examiner is verified, calibrated, and held to a quality standard. Candidates deserve the real thing.", accent: "bg-violet-50 text-violet-600" },
  { icon: TrendingUp, title: "Results that mean something", body: "A band score should reflect genuine ability — and our feedback should help candidates actually improve.", accent: "bg-emerald-50 text-emerald-600" },
  { icon: Globe, title: "Accessible anywhere", body: "The best preparation shouldn't require you to be in a specific city or country. We're fully remote by design.", accent: "bg-rose-50 text-rose-600" },
];

const CREDIBILITY = [
  ["Official CBT Format", "Computer-delivered interface tested against real exam conditions by certified examiners."],
  ["Verified Examiners", "All credentials independently verified before onboarding. Ongoing calibration."],
  ["Secure Payments", "Encrypted checkout handled by our payment provider. No card data stored on our servers."],
];

export default async function AboutPage() {
  const stats = await fetchHeroStats();
  const storyStats: [string, string][] = [
    [String(SITE.foundedYear), "Founded"],
    ...(stats.mocks ? [[stats.mocks, "Mocks delivered"] as [string, string]] : []),
    ...(stats.examiners ? [[stats.examiners, "Certified examiners"] as [string, string]] : []),
    ...(stats.rating ? [[`${stats.rating}★`, "Avg. examiner rating"] as [string, string]] : []),
  ];

  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="We built the mock we wished existed"
        subtitle={`${SITE.name} was founded to give candidates access to the most realistic, most useful mock exam available — anywhere in the world.`}
      />

      <Section className="pt-16">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <Reveal direction="left">
            <SectionHeading eyebrow="Our Story" title="Born from a frustrating experience" />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
              <p>
                Our team came together around a shared frustration: the free mock tests most
                candidates rely on don&apos;t replicate the real exam experience — the
                server-controlled audio, the strict timer, or the live Speaking session with a real
                examiner. Feeling prepared and being prepared turned out to be very different things.
              </p>
              <p>
                Realistic conditions and genuine examiner feedback are what actually move a band
                score. The difference is rarely raw language ability — it&apos;s preparation quality.
              </p>
              <p>
                {SITE.name} launched in {SITE.foundedYear} with one goal: give every candidate access to the most
                realistic, most useful IELTS mock exam available — at a price that doesn&apos;t require
                a tutor-level budget.
              </p>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div
              className={cn(
                "grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-lg",
                storyStats.length === 1 ? "grid-cols-1" : "grid-cols-2",
              )}
            >
              {storyStats.map(([value, label]) => (
                <div key={label} className="bg-navy p-6">
                  <p className="text-3xl font-extrabold text-white">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="bg-white">
        <Reveal>
          <SectionHeading eyebrow="Our Values" title="What we stand for" />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <StaggerItem key={v.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", v.accent)}>
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{v.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section className="bg-white">
        <Reveal>
          <SectionHeading align="center" eyebrow="Credibility" title="Recognised and trusted" />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CREDIBILITY.map(([title, body]) => (
            <StaggerItem key={title} className="rounded-2xl border border-border bg-slate-50/60 p-6">
              <p className="inline-flex items-center gap-2 font-bold text-navy">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </>
  );
}
