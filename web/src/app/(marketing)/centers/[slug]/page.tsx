import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Users,
  ClipboardCheck,
  GraduationCap,
  Send,
} from "lucide-react";
import { Glow, Pill, Section } from "@/components/marketing/ui/primitives";
import { WaveDivider } from "@/components/marketing/ui/page-hero";
import { CenterLogo } from "@/components/marketing/shared/center-logo";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { fetchCenter } from "@/lib/marketing/server-data";

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
    title: `${center.name} — iTestU Partner Centre`,
    description:
      center.bio ??
      `${center.name} is an official iTestU partner centre delivering real IELTS mocks with examiner feedback.`,
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
  const stats = [
    {
      icon: Users,
      value: center.studentCount.toLocaleString(),
      label: "Active students",
    },
    {
      icon: ClipboardCheck,
      value: center.mocksDelivered.toLocaleString(),
      label: "Mocks delivered",
    },
    {
      icon: GraduationCap,
      value: center.examinerCount.toLocaleString(),
      label: "Examiners",
    },
  ];

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
            <ChevronLeft className="h-4 w-4" /> All centres
          </Link>

          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <CenterLogo
                name={center.name}
                logoUrl={center.logoUrl}
                size="lg"
                className="h-24 w-24 border-white/10 bg-white"
              />
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

            <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur lg:w-80">
              <p className="text-sm font-semibold text-white">
                Study here? Join via Telegram
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Sign up with this centre through our bot, then verify your email
                to open your student panel.
              </p>
              {center.joinDeepLink ? (
                <a
                  href={center.joinDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-red text-sm font-semibold text-white shadow-lg shadow-brand-red/30 transition-all hover:bg-brand-red-hover hover:-translate-y-0.5"
                >
                  <Send className="h-4 w-4" /> Join via Telegram
                </a>
              ) : (
                <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-center text-xs text-slate-400">
                  Sign-up link coming soon — contact the centre directly.
                </p>
              )}
            </div>
          </div>

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
        </div>

        <WaveDivider />
      </section>

      <Section className="pt-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-navy">
            About {center.name}
          </h2>
          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted">
            {center.bio?.trim() ||
              `${center.name} is an official iTestU partner centre. Students prepare and sit real computer-delivered IELTS mocks here, graded by certified examiners with full criteria-level feedback.`}
          </p>
        </div>
      </Section>

      <FinalCta
        eyebrow="Ready to start?"
        title={`Prepare for IELTS with ${center.name}`}
        subtitle="Join via Telegram to get your student account and book your first mock."
        primaryLabel="Explore mock exams"
        primaryHref="/mock-exams"
      />
    </>
  );
}
