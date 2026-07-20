import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MockPackage } from "@/lib/marketing/data";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal } from "@/components/marketing/motion/reveal";
import { PricingPlans } from "@/components/marketing/shared/pricing-plans";

type Props = {
  packages: MockPackage[];
};

export function HomePricingTeaser({ packages }: Props) {
  if (packages.length === 0) return null;

  return (
    <Section className="bg-white">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Pricing"
          title="Transparent mock exam pricing"
          subtitle="Full Academic mocks and single-skill modules — book when you're ready."
        />
      </Reveal>
      <div className="mt-12">
        <PricingPlans packages={packages} />
      </div>
      <Reveal className="mt-10 flex justify-center">
        <CtaButton href="/pricing" variant="secondary" withArrow>
          Compare all plans
        </CtaButton>
      </Reveal>
      <p className="mt-6 text-center text-sm text-muted">
        Self-serve practice packages are sold inside your student account —{" "}
        <Link href="/practice" className="font-medium text-navy hover:underline">
          learn about practice
          <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" />
        </Link>
      </p>
    </Section>
  );
}
