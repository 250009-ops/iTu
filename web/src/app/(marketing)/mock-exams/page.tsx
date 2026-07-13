import type { Metadata } from "next";
import { CalendarCheck, UserCheck, Server } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { PackageGrid } from "@/components/marketing/shared/package-grid";
import { TestimonialCard } from "@/components/marketing/shared/testimonial-card";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { fetchPackages, fetchTestimonials } from "@/lib/marketing/server-data";

export const metadata: Metadata = {
  title: "IELTS Mock Exam Packages — Academic, General Training & Single Skills",
  description:
    "Choose your IELTS mock exam package: full 4-skill Academic or General Training, or single Speaking and Writing modules. Real examiners, same-day results.",
  alternates: { canonical: "/mock-exams" },
};

const INFO = [
  {
    icon: CalendarCheck,
    title: "Academic vs GT",
    body: "Academic is required for university admission, professional registration, and certain visas. General Training is for secondary education, work experience, and migration.",
  },
  {
    icon: UserCheck,
    title: "Examiner selection",
    body: "All packages include examiner selection for Writing and Speaking modules. Browse by speciality, rating, and availability before you book.",
  },
  {
    icon: Server,
    title: "Same exam engine",
    body: "Every package uses the same server-authoritative exam platform — the same audio quality, CBT interface, and timing rules as the full 4-skill mock.",
  },
];

export default async function MockExamsPage() {
  const [packages, testimonials] = await Promise.all([
    fetchPackages(),
    fetchTestimonials(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Mock Exams"
        title="Choose your exam package"
        subtitle="Academic or General Training. Full 4-skill or individual modules. Real examiners, same-day results."
      />

      <Section className="pt-12">
        <PackageGrid packages={packages} />

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

      <FinalCta
        title="Ready to sit your mock?"
        subtitle="Book a full 4-skill mock with a certified examiner. Same-day results."
        primaryLabel="Book a Full Mock — 56,000 so'm"
      />
    </>
  );
}
