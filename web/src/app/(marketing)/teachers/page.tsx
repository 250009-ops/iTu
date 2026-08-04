import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section } from "@/components/marketing/ui/primitives";
import { TeachersDirectory } from "@/components/marketing/shared/teachers-directory";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { fullMockCtaLabel } from "@/lib/marketing/data";
import { fetchPackages, fetchTeachers } from "@/lib/marketing/server-data";

export const metadata: Metadata = {
  title: "Certified IELTS Examiners — Browse & Choose Your Grader",
  description:
    "Browse certified IELTS examiners by speciality, rating, and availability. Choose who grades your Writing and conducts your Speaking session.",
  alternates: { canonical: "/teachers" },
};

export default async function TeachersPage() {
  const [teachers, packages] = await Promise.all([fetchTeachers(), fetchPackages()]);

  return (
    <>
      <PageHero
        eyebrow="Examiner Directory"
        title="Meet your certified examiners"
        subtitle="Browse, compare, and choose who grades your Writing and conducts your Speaking session."
      />

      <Section className="pt-12">
        <TeachersDirectory teachers={teachers} />
      </Section>

      <FinalCta
        title="Found your examiner?"
        subtitle="Book a mock and select your Writing grader and Speaking examiner at checkout."
        primaryLabel={fullMockCtaLabel(packages)}
      />
    </>
  );
}
