import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { CtaButton, Section } from "@/components/marketing/ui/primitives";
import { CenterCard } from "@/components/marketing/shared/center-card";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { fetchCenters } from "@/lib/marketing/server-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner IELTS Centres — Find an iTestU Centre Near You",
  description:
    "Browse official iTestU partner centres delivering real computer-delivered IELTS mocks with certified examiner feedback. Join your local centre via Telegram.",
  alternates: { canonical: "/centers" },
};

export default async function CentersPage() {
  const centers = await fetchCenters();

  return (
    <>
      <PageHero
        eyebrow="Partner Centres"
        title="Find an iTestU partner centre"
        subtitle="Official education centres delivering real computer-delivered IELTS mocks with certified examiner feedback — join the one nearest you."
      />

      <Section className="pt-12">
        {centers.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {centers.map((center) => (
              <CenterCard key={center.id} center={center} />
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy/5">
              <Building2 className="h-7 w-7 text-navy" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-navy">
              Partner centres are coming soon
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              We&apos;re onboarding education centres across the country. Run a
              centre? Partner with iTestU to deliver mocks to your students.
            </p>
            <CtaButton href="/for-institutions" className="mt-6" withArrow>
              Become a partner
            </CtaButton>
          </div>
        )}
      </Section>

      <FinalCta
        title="Run an education centre?"
        subtitle="Buy mocks in bulk, run exams with your own teachers, and manage your students from one dashboard."
        primaryLabel="Partner with iTestU"
        primaryHref="/for-institutions"
      />
    </>
  );
}
