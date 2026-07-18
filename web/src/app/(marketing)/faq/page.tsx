import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MARKETING_FAQS } from "@/lib/marketing/data";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section } from "@/components/marketing/ui/primitives";
import { Reveal } from "@/components/marketing/motion/reveal";
import { FaqExplorer } from "@/components/marketing/shared/faq-explorer";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description:
    `Everything you need to know about iTestU: the exam, results, examiners, technical requirements, and booking. Search and browse by category.`,
  alternates: { canonical: "/faq" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: MARKETING_FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        subtitle="Everything you need to know about iTestU. Can't find your answer? Contact our support team."
      />

      <Section className="pt-12">
        <FaqExplorer />

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-2xl border border-border bg-slate-50/60 px-6 py-8 text-center">
            <p className="text-lg font-bold text-navy">Still have a question?</p>
            <p className="mt-1 text-sm text-muted">
              Our support team typically responds within 4 business hours.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-navy-light hover:-translate-y-0.5"
            >
              Contact support <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
