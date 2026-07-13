import type { Metadata } from "next";
import { Users, BarChart3, Globe, ShieldCheck, FileText, Check } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { InstitutionForm } from "@/components/marketing/shared/institution-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "For Institutions — Bulk IELTS Mock Exams for Your Students",
  description:
    "Universities, language schools, and test prep centres: streamline IELTS preparation with centrally managed mock exams, aggregate reporting, and volume discounts.",
  alternates: { canonical: "/for-institutions" },
};

const FEATURES = [
  { icon: Users, title: "Bulk enrolments", body: "Enrol 10 to 1,000 students from a single admin dashboard. Assign mock dates, set cohorts, and track progress across your entire group.", accent: "bg-sky-50 text-sky-600" },
  { icon: BarChart3, title: "Aggregate reporting", body: "Institution-level dashboards showing band distributions, cohort averages, skill breakdowns, and improvement over time.", accent: "bg-violet-50 text-violet-600" },
  { icon: Globe, title: "Flexible delivery", body: "Students sit exams from home or your computer lab. No hardware to install. Works in any browser on any school device.", accent: "bg-emerald-50 text-emerald-600" },
  { icon: ShieldCheck, title: "Exam integrity", body: "Same ID verification, webcam monitoring, and single-screen enforcement as individual bookings. Institution data kept separate.", accent: "bg-amber-50 text-amber-600" },
  { icon: FileText, title: "Invoiced billing", body: "Receive a single monthly invoice for all your student bookings. PO-based billing available for public institutions.", accent: "bg-rose-50 text-rose-600" },
  { icon: Check, title: "Volume discounts", body: "10+ mocks: 10% off. 50+: 15% off. 100+: 20% off. Enterprise pricing available for 500+ annual bookings. Contact us for a quote.", accent: "bg-sky-50 text-sky-600" },
];

const VOLUME: Array<[string, string, string, string]> = [
  ["1–9", "56,000 so'm", "—", "2,800,000 so'm"],
  ["10–49", "50,400 so'm", "10% off", "2,520,000 so'm"],
  ["50–99", "47,600 so'm", "15% off", "2,380,000 so'm"],
  ["100–499", "44,800 so'm", "20% off", "2,240,000 so'm"],
  ["500+", "Custom", "Custom", "Contact us"],
];

export default function ForInstitutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="For Institutions"
        title="Bulk IELTS mock exams for your students"
        subtitle="Universities, language schools, and test prep centres — streamline IELTS preparation with centrally managed mock exams."
      />

      <Section className="pt-16">
        <Reveal>
          <SectionHeading
            eyebrow="Why IELTS Mock for Institutions"
            title="Built for scale, designed for administrators"
          />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", f.accent)}>
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section className="bg-white pt-0">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Volume Pricing"
            title="The more you book, the more you save"
          />
        </Reveal>
        <Reveal className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                <th className="px-5 py-3.5">Volume</th>
                <th className="px-5 py-3.5">Per mock</th>
                <th className="px-5 py-3.5">Saving</th>
                <th className="px-5 py-3.5 text-right">Monthly (50/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {VOLUME.map(([vol, price, save, monthly], i) => (
                <tr key={vol} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="px-5 py-3 font-medium text-foreground">{vol}</td>
                  <td className="px-5 py-3 font-semibold text-emerald-600">{price}</td>
                  <td className="px-5 py-3 font-medium text-amber-600">{save}</td>
                  <td className="px-5 py-3 text-right text-muted">{monthly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Get in touch"
            title="Request a demo or bulk quote"
            subtitle="Fill in the form below and our team will respond within one business day."
          />
        </Reveal>
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <InstitutionForm />
        </Reveal>
      </Section>
    </>
  );
}
