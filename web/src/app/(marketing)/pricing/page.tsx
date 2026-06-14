import type { Metadata } from "next";
import { Check, X, Lock, ShieldCheck, Star, BadgeCheck } from "lucide-react";
import type { MarketingFaq } from "@/lib/marketing/data";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { PricingPlans } from "@/components/marketing/shared/pricing-plans";
import { FaqAccordion } from "@/components/marketing/shared/faq-accordion";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { fetchHeroStats } from "@/lib/marketing/server-data";

export const metadata: Metadata = {
  title: "Pricing — Transparent IELTS Mock Exam Plans",
  description:
    "Simple, transparent IELTS mock pricing. Human grading, examiner choice, and same-day results included. No add-ons, no surprises.",
  alternates: { canonical: "/pricing" },
};

const COMPARISON: Array<{ feature: string; academic: boolean; gt: boolean; speaking: boolean; writing: boolean }> = [
  { feature: "Listening (auto-scored)", academic: true, gt: true, speaking: false, writing: false },
  { feature: "Reading (auto-scored)", academic: true, gt: true, speaking: false, writing: false },
  { feature: "Writing (teacher-graded)", academic: true, gt: true, speaking: false, writing: true },
  { feature: "Speaking (live video, teacher-graded)", academic: true, gt: true, speaking: true, writing: false },
  { feature: "Pick your examiner", academic: true, gt: true, speaking: true, writing: true },
  { feature: "Same-day band release", academic: true, gt: true, speaking: true, writing: false },
  { feature: "Criteria-level written feedback", academic: true, gt: true, speaking: true, writing: true },
  { feature: "Score progression tracking", academic: true, gt: true, speaking: false, writing: false },
  { feature: "Secure exam environment", academic: true, gt: true, speaking: true, writing: true },
];

const SLA = { academic: "Same day", gt: "Same day", speaking: "Same day", writing: "24 hours" };


const PRICING_FAQS: MarketingFaq[] = [
  { id: "which", category: "Booking", question: "Which package should I choose?", answer: "If you need a full band score for university or a visa, choose the Full Academic or General Training mock. If you only want to practise one skill before your real test, the Speaking Only or Writing Only packages are a cost-effective option." },
  { id: "multiple", category: "Booking", question: "Can I take multiple mocks?", answer: "Yes — there is no limit. Every mock gives you fresh exam content and a new examiner selection. Your score history is tracked across all attempts so you can see your improvement over time." },
  { id: "payment", category: "Booking", question: "What payment methods are accepted?", answer: "We accept all major credit and debit cards via Stripe, plus bank transfer for institutional bookings. All transactions are encrypted and PCI-DSS compliant." },
  { id: "discount", category: "Booking", question: "Is there a group or institutional discount?", answer: "Yes. Bookings of 10+ mocks receive 10% off, 50+ receive 15% off, and 100+ receive 20% off. Contact our institutions team for a custom quote." },
  { id: "refund", category: "Booking", question: "Can I get a refund?", answer: "Full refund if you cancel at least 24 hours before your mock date. Within 24 hours you can reschedule once at no cost. Refunds are processed within 5 business days." },
];

function Cell({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600" />
  ) : (
    <X className="mx-auto h-4 w-4 text-slate-300" />
  );
}

export default async function PricingPage() {
  const stats = await fetchHeroStats();
  const TRUST = [
    { icon: Lock, title: "Secure payment", body: "Stripe-encrypted checkout" },
    { icon: ShieldCheck, title: "Certified examiners", body: "CELTA+ qualified, ID verified" },
    { icon: Star, title: `${stats.rating}★ rating`, body: `${stats.candidates} satisfied candidates` },
    { icon: BadgeCheck, title: "IDP-faithful format", body: "Server-authoritative timers" },
  ];

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple, transparent pricing"
        subtitle="No add-ons. No surprises. Human grading, examiner choice, and same-day results — all included."
      />

      <Section className="pt-12">
        <PricingPlans />
      </Section>

      {/* Comparison */}
      <Section className="bg-white pt-0">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Comparison"
            title="Feature breakdown by package"
          />
        </Reveal>
        <Reveal className="mt-10 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                <th className="px-4 py-3.5 sm:px-6">Feature</th>
                <th className="px-3 py-3.5 text-center">Academic</th>
                <th className="px-3 py-3.5 text-center">GT</th>
                <th className="px-3 py-3.5 text-center">Speaking Only</th>
                <th className="px-3 py-3.5 text-center">Writing Only</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="px-4 py-3 font-medium text-foreground sm:px-6">{row.feature}</td>
                  <td className="px-3 py-3"><Cell value={row.academic} /></td>
                  <td className="px-3 py-3"><Cell value={row.gt} /></td>
                  <td className="px-3 py-3"><Cell value={row.speaking} /></td>
                  <td className="px-3 py-3"><Cell value={row.writing} /></td>
                </tr>
              ))}
              <tr className="bg-white">
                <td className="px-4 py-3 font-medium text-foreground sm:px-6">Grading SLA</td>
                <td className="px-3 py-3 text-center text-xs font-semibold text-emerald-600">{SLA.academic}</td>
                <td className="px-3 py-3 text-center text-xs font-semibold text-emerald-600">{SLA.gt}</td>
                <td className="px-3 py-3 text-center text-xs font-semibold text-emerald-600">{SLA.speaking}</td>
                <td className="px-3 py-3 text-center text-xs font-semibold text-amber-600">{SLA.writing}</td>
              </tr>
            </tbody>
          </table>
        </Reveal>
      </Section>

      {/* Trust */}
      <Section className="py-0">
        <Stagger className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-6 md:grid-cols-4">
          {TRUST.map((t) => (
            <StaggerItem key={t.title} className="text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <t.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-bold text-navy">{t.title}</p>
              <p className="text-xs text-muted">{t.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* Pricing FAQ */}
      <Section>
        <Reveal>
          <SectionHeading align="center" eyebrow="Pricing FAQ" title="Questions about pricing" />
        </Reveal>
        <div className="mx-auto mt-10 max-w-3xl">
          <FaqAccordion faqs={PRICING_FAQS} defaultOpenId="multiple" />
        </div>
      </Section>

      <FinalCta
        title="See your own band report"
        subtitle="Book a full mock and receive the same detailed breakdown with criteria-level examiner feedback."
        primaryLabel="Book a Full Mock — $49"
      />
    </>
  );
}
