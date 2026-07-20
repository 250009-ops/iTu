import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MockPackage } from "@/lib/marketing/data";
import { Section, SectionHeading } from "@/components/marketing/ui/primitives";
import { Reveal } from "@/components/marketing/motion/reveal";
import { PackageCard } from "@/components/marketing/shared/package-card";

type Props = {
  packages: MockPackage[];
};

export function HomePricingTeaser({ packages }: Props) {
  const full =
    packages.find((p) => p.examType === "ACADEMIC" && p.skills.length === 4) ??
    packages[0];
  const side = packages
    .filter((p) => p.skills.length === 1 && p.id !== full?.id)
    .slice(0, 2);

  if (!full && side.length === 0) return null;

  const featured = [full, ...side].filter(Boolean) as MockPackage[];

  return (
    <Section className="bg-white">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Packages"
          title="Pick your mock, book in minutes"
          subtitle="Full Academic mocks and single-skill modules — all graded by certified examiners."
        />
      </Reveal>
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
      <Reveal className="mt-10 flex justify-center">
        <Link
          href="/mock-exams"
          className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-brand-red"
        >
          View all packages <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </Section>
  );
}
