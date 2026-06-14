import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ArrowRight, ChevronLeft } from "lucide-react";
import { Glow, Avatar, Pill, Section } from "@/components/marketing/ui/primitives";
import { WaveDivider } from "@/components/marketing/ui/page-hero";
import { TeacherProfileTabs } from "@/components/marketing/shared/teacher-profile-tabs";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { fetchTeacher } from "@/lib/marketing/server-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const teacher = await fetchTeacher(slug);
  if (!teacher) return {};
  return {
    title: `${teacher.name} — Certified IELTS Examiner`,
    description: teacher.bio,
    alternates: { canonical: `/teachers/${teacher.slug}` },
  };
}

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const teacher = await fetchTeacher(slug);
  if (!teacher) notFound();

  return (
    <>
      <section className="relative overflow-hidden bg-navy">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]" />
        <Glow className="-right-20 top-0 h-80 w-80" color="rgba(139,92,246,0.22)" />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-28 sm:pt-32">
          <Link
            href="/teachers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> All examiners
          </Link>

          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar initials={teacher.initials} size="xl" className="h-24 w-24 text-2xl" />
              <div>
                {teacher.isTopRated ? (
                  <Pill tone="amber" className="bg-amber-400/20 text-amber-300">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Top Rated
                  </Pill>
                ) : null}
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                  {teacher.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                    <span className="ml-1 text-sm font-semibold text-white">
                      {teacher.rating} ({teacher.reviewCount.toLocaleString()} reviews)
                    </span>
                  </span>
                  <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-200">
                    {teacher.speciality}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {teacher.credentials.map((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur lg:w-72">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-extrabold text-white">
                    {teacher.totalSessions.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">sessions completed</p>
                </div>
                <div className="text-right">
                  <p className="inline-flex items-center gap-1 text-2xl font-extrabold text-white">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" /> {teacher.rating}
                  </p>
                  <p className="text-xs text-slate-400">rating</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {teacher.languages.map((l) => (
                  <span
                    key={l}
                    className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-slate-200"
                  >
                    {l}
                  </span>
                ))}
              </div>
              <Link
                href="/mock-exams"
                className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-red text-sm font-semibold text-white shadow-lg shadow-brand-red/30 transition-all hover:bg-brand-red-hover hover:-translate-y-0.5"
              >
                Book this examiner <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-center text-xs text-slate-400">
                Select your exam date after booking
              </p>
            </div>
          </div>
        </div>

        <WaveDivider />
      </section>

      <Section className="pt-10">
        <TeacherProfileTabs teacher={teacher} />
      </Section>

      <FinalCta
        title="Book your mock with a certified examiner"
        subtitle="Pick your package, choose your date, and select your examiner at checkout."
        primaryLabel="Book a Full Mock — $49"
      />
    </>
  );
}
