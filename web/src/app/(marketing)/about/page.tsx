import type { Metadata } from "next";
import { ShieldCheck, Award, TrendingUp, Globe, CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading, Avatar } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { fetchHeroStats } from "@/lib/marketing/server-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About — Built by Exam Professionals",
  description:
    "IELTS Mock was founded to give candidates access to the most realistic, most useful mock exam available anywhere. Built by former examiners and exam-infrastructure engineers.",
  alternates: { canonical: "/about" },
};


const VALUES = [
  { icon: ShieldCheck, title: "Exam fidelity above all", body: "We will never make the test easier to flatter candidates. Realistic conditions are the whole point.", accent: "bg-sky-50 text-sky-600" },
  { icon: Award, title: "Examiner excellence", body: "Every examiner is verified, calibrated, and held to a quality standard. Candidates deserve the real thing.", accent: "bg-violet-50 text-violet-600" },
  { icon: TrendingUp, title: "Results that mean something", body: "A band score should reflect genuine ability — and our feedback should help candidates actually improve.", accent: "bg-emerald-50 text-emerald-600" },
  { icon: Globe, title: "Accessible anywhere", body: "The best preparation shouldn't require you to be in a specific city or country. We're fully remote by design.", accent: "bg-rose-50 text-rose-600" },
];

const TEAM = [
  { initials: "OC", name: "Oliver Chen", role: "Co-founder & CEO", body: "Former Cambridge English product lead. Built the platform after failing to find a realistic mock exam for his own IELTS retake." },
  { initials: "LH", name: "Layla Hassan", role: "Head of Examiner Quality", body: "IDP-certified IELTS examiner for 11 years. Runs calibration training and quality audits for every examiner on the platform." },
  { initials: "JT", name: "James Thornton", role: "CTO", body: "Previously built server-authoritative exam infrastructure at Pearson. Responsible for the timer and integrity engine." },
  { initials: "AO", name: "Amara Osei-Bonsu", role: "Head of Candidate Success", body: "CELTA instructor and Band 9 holder. Leads the support team and curates the improvement guidance engine in every results report." },
];

const CREDIBILITY = [
  ["IDP-Faithful Format", "CBT interface tested against real IDP exam conditions by former examiners."],
  ["Verified Examiners", "All credentials independently verified before onboarding. Ongoing calibration."],
  ["SSL Secured Payments", "Stripe-encrypted checkout. PCI DSS compliant. No card data stored."],
  ["GDPR Compliant", "Candidate data stored and processed under EU GDPR. Right to erasure supported."],
  ["ISO 27001 Hosting", "Exam infrastructure hosted on ISO 27001 certified cloud infrastructure."],
  ["WCAG 2.1 AA", "Platform tested for accessibility compliance. Screen reader compatible."],
];

export default async function AboutPage() {
  const stats = await fetchHeroStats();
  const storyStats: [string, string][] = [
    ["2022", "Founded"],
    [stats.mocks, "Mocks delivered"],
    [stats.examiners, "Certified examiners"],
    [`${stats.rating}★`, "Avg. examiner rating"],
    ["62", "Countries reached"],
    ["48h", "Avg. results time"],
  ];

  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="We built the mock we wished existed"
        subtitle="IELTS Mock was founded to give candidates access to the most realistic, most useful mock exam available — anywhere in the world."
      />

      <Section className="pt-16">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <Reveal direction="left">
            <SectionHeading eyebrow="Our Story" title="Born from a frustrating experience" />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
              <p>
                In 2020, our founder Oliver sat the IELTS Academic exam and scored 0.5 below his
                target. He&apos;d done five mock tests — all from free online platforms — and felt
                genuinely prepared. But none of those tests had replicated the real exam experience:
                the server-controlled audio, the strict timer, the live Speaking session with a real
                examiner.
              </p>
              <p>
                He retook the exam three months later after building his own practice environment and
                working with a certified examiner. He scored Band 8.5. The difference wasn&apos;t his
                language ability — it was preparation quality.
              </p>
              <p>
                IELTS Mock launched in 2022 with one goal: give every candidate access to the most
                realistic, most useful IELTS mock exam available — at a price that doesn&apos;t require
                a tutor-level budget.
              </p>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-lg">
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

      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="The Team"
            title="Built by exam professionals"
            subtitle="Every person on this team has either sat the IELTS exam or worked in IELTS assessment."
          />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <StaggerItem key={m.name} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <Avatar initials={m.initials} size="lg" />
              <h3 className="mt-4 font-bold text-navy">{m.name}</h3>
              <p className="text-sm font-semibold text-brand-red">{m.role}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
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
