import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Users,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";
import { Glow, Pill, Section, SectionHeading } from "@/components/marketing/ui/primitives";
import { WaveDivider } from "@/components/marketing/ui/page-hero";
import { Reveal } from "@/components/marketing/motion/reveal";
import { CenterLogo } from "@/components/marketing/shared/center-logo";
import { CenterJoinForm } from "@/components/marketing/shared/center-join-form";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { fetchCenter } from "@/lib/marketing/server-data";
import { formatSocialCount } from "@/lib/marketing/social-proof";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const center = await fetchCenter(slug);
  if (!center) return {};
  return {
    title: `${center.name} — iTestU Edu Center`,
    description:
      center.bio ??
      `${center.name} is an official iTestU Edu Center delivering real IELTS mocks with examiner feedback.`,
    alternates: { canonical: `/centers/${center.slug}` },
  };
}

export default async function CenterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const center = await fetchCenter(slug);
  if (!center) notFound();

  const partnerSince = new Date(center.partnerSince).getFullYear();

  function statEntry(count: number, icon: typeof Users, label: string) {
    const value = formatSocialCount(count);
    return value ? { icon, value, label } : null;
  }

  const stats = [
    statEntry(center.studentCount, Users, "Active students"),
    statEntry(center.mocksDelivered, ClipboardCheck, "Mocks delivered"),
    statEntry(center.examinerCount, GraduationCap, "Examiners"),
  ].filter(Boolean) as { icon: typeof Users; value: string; label: string }[];

  return (
    <>
      <section className="relative overflow-hidden bg-navy">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]" />
        <Glow className="-right-20 top-0 h-80 w-80" color="rgba(14,165,233,0.22)" />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-28 sm:pt-32">
          <Link
            href="/centers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> All Edu Centers
          </Link>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <CenterLogo name={center.name} size="lg" className="h-24 w-24" />
            <div>
              <Pill tone="onNavy">Official Partner · since {partnerSince}</Pill>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                {center.name}
              </h1>
              {center.city || center.address ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-300">
                  <MapPin className="h-4 w-4" />
                  {[center.address, center.city].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </div>
          </div>

          {stats.length > 0 ? (
            <div className="mt-10 grid grid-cols-3 gap-3 sm:max-w-lg">
              {stats.map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur"
                >
                  <Icon className="mx-auto h-5 w-5 text-sky-300" />
                  <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
                  <p className="text-[11px] text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <WaveDivider />
      </section>

      <Section className="pt-12">
        <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <SectionHeading
              eyebrow="About"
              title={`About ${center.name}`}
            />
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted">
              {center.bio?.trim() ||
                `${center.name} is an official iTestU Edu Center. Students prepare and sit real computer-delivered IELTS mocks here, graded by certified examiners with full criteria-level feedback.`}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <CenterJoinForm
              slug={center.slug}
              centerName={center.name}
              joinDeepLink={center.joinDeepLink}
              variant="light"
            />
          </Reveal>
        </div>
      </Section>

      <FinalCta
        eyebrow="Ready to start?"
        title={`Prepare for IELTS with ${center.name}`}
        subtitle="Sign up above to get your student account, then book your first mock."
        primaryLabel="Explore mock exams"
        primaryHref="/mock-exams"
      />
    </>
  );
}
