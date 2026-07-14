import type { Metadata } from "next";
import { Building2, GraduationCap, Users, BarChart3 } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { CenterCard } from "@/components/marketing/shared/center-card";
import { InstitutionForm } from "@/components/marketing/shared/institution-form";
import { PartnerMarquee } from "@/components/marketing/shared/partner-marquee";
import { fetchCenters } from "@/lib/marketing/server-data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edu Centers — Find an iTestU Partner Near You",
  description:
    "Browse official iTestU Edu Centers delivering real computer-delivered IELTS mocks with certified examiner feedback. Join your local centre or partner with us.",
  alternates: { canonical: "/centers" },
};

const PARTNER_BENEFITS = [
  {
    icon: Users,
    title: "Bulk enrolments",
    body: "Enrol cohorts from one dashboard — assign mock dates and track every student.",
    accent: "bg-sky-50 text-sky-600",
  },
  {
    icon: BarChart3,
    title: "Centre reporting",
    body: "Band distributions, skill breakdowns, and improvement trends for your students.",
    accent: "bg-violet-50 text-violet-600",
  },
  {
    icon: GraduationCap,
    title: "Your examiners",
    body: "Use your own certified teachers or tap into the iTestU examiner network.",
    accent: "bg-emerald-50 text-emerald-600",
  },
];

export default async function CentersPage() {
  const centers = await fetchCenters();

  return (
    <>
      <PageHero
        eyebrow="Edu Centers"
        title="Find your local Edu Center"
        subtitle="Official education centres delivering real computer-delivered IELTS mocks with certified examiner feedback — join the one nearest you."
      />

      {centers.length > 0 ? <PartnerMarquee centers={centers} /> : null}

      <Section className={centers.length > 0 ? "pt-12" : "pt-16"}>
        <Reveal>
          <SectionHeading
            eyebrow="Directory"
            title={centers.length > 0 ? "Browse Edu Centers" : "Edu Centers are coming soon"}
            subtitle={
              centers.length > 0
                ? "Select a centre to view details and sign up as a student."
                : "We are onboarding Edu Centers across the country. Run a centre? Apply below."
            }
          />
        </Reveal>

        {centers.length > 0 ? (
          <Stagger
            className={cn(
              "mt-12 grid gap-6",
              centers.length === 1 && "mx-auto max-w-md grid-cols-1",
              centers.length === 2 && "mx-auto max-w-3xl grid-cols-1 sm:grid-cols-2",
              centers.length >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {centers.map((center) => (
              <StaggerItem key={center.id}>
                <CenterCard center={center} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <Reveal className="mx-auto mt-12 flex max-w-lg flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy/5">
              <Building2 className="h-7 w-7 text-navy" />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              Be among the first Edu Centers on iTestU — deliver mocks to your students with
              full reporting and branded onboarding.
            </p>
            <CtaButton href="#partner" className="mt-6" withArrow>
              Apply to partner
            </CtaButton>
          </Reveal>
        )}
      </Section>

      <Section id="partner" className="scroll-mt-24 bg-white">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal direction="left">
            <SectionHeading
              eyebrow="Partner with iTestU"
              title="Run an Edu Center?"
              subtitle="Buy mocks in bulk, manage students from one dashboard, and deliver the most realistic IELTS preparation available."
            />
            <Stagger className="mt-10 space-y-4">
              {PARTNER_BENEFITS.map((b) => (
                <StaggerItem
                  key={b.title}
                  className="flex gap-4 rounded-2xl border border-border bg-slate-50/60 p-5"
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      b.accent,
                    )}
                  >
                    <b.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-navy">{b.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{b.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
            <p className="mt-8 text-sm text-muted">
              Prefer email?{" "}
              <a
                href="mailto:institutions@itestu.uz"
                className="font-semibold text-navy underline-offset-4 hover:underline"
              >
                institutions@itestu.uz
              </a>
            </p>
          </Reveal>

          <Reveal direction="right">
            <InstitutionForm />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
