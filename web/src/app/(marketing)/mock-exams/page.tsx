import type { Metadata } from "next";
import { CalendarCheck, UserCheck, Server } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { MockExamsCatalog } from "@/components/marketing/shared/mock-exams-catalog";
import { TestimonialCard } from "@/components/marketing/shared/testimonial-card";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { fetchPackages, fetchTestimonials } from "@/lib/marketing/server-data";

import { PRODUCT_CLAIMS, fullMockCtaLabel } from "@/lib/marketing/data";

export const metadata: Metadata = {
  title: "Mock Exams — iTestU IELTS Packages (Academic & Single Skills)",
  description:
    "Choose your IELTS mock exam package: full 4-skill Academic or single Speaking, Writing, Listening, and Reading modules. Real examiners, results when all skills are graded.",
  alternates: { canonical: "/mock-exams" },
};

const INFO = [
  {
    icon: CalendarCheck,
    title: "Academic now, GT soon",
    body: PRODUCT_CLAIMS.academicOnlyNote,
  },
  {
    icon: UserCheck,
    title: "Examiner selection",
    body: "All packages include examiner selection for Writing and Speaking modules. Browse by speciality and rating, then pick who grades you.",
  },
  {
    icon: Server,
    title: "Same exam engine",
    body: "Every package uses the same server-authoritative exam platform — the same audio quality, CBT interface, and timing rules as the full 4-skill mock.",
  },
];

export default async function MockExamsPage({
  searchParams,
}: {
  searchParams?: Promise<{ package?: string }> | { package?: string };
}) {
  const [packages, testimonials] = await Promise.all([
    fetchPackages(),
    fetchTestimonials(),
  ]);
  const params = await Promise.resolve(searchParams ?? {});
  const highlightSlug = params.package;

  return (
    <>
      <PageHero
        eyebrow="Mock Exams"
        title="Choose your exam package"
        subtitle="Academic full mocks and single-skill modules. Real examiners, results when all skills are graded."
      />

      <Section className="pt-12">
        <MockExamsCatalog packages={packages} highlightSlug={highlightSlug} />

        <Stagger className="mt-16 grid grid-cols-1 gap-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:grid-cols-3 sm:p-8">
          {INFO.map((item) => (
            <StaggerItem key={item.title}>
              <item.icon className="h-6 w-6 text-navy" strokeWidth={1.75} />
              <h3 className="mt-3 font-bold text-navy">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {testimonials.length > 0 ? (
        <Section className="bg-white pt-0">
          <Reveal>
            <h2 className="text-2xl font-bold text-navy">What candidates say</h2>
          </Reveal>
          <Stagger className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.slice(0, 3).map((item) => (
              <StaggerItem key={item.id}>
                <TestimonialCard item={item} />
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      ) : null}

      <FinalCta
        title="Ready to sit your mock?"
        subtitle="Book a full 4-skill Academic mock with a certified examiner. Results release when all skills are graded."
        primaryLabel={fullMockCtaLabel(packages)}
      />
    </>
  );
}
