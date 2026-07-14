import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SITE, MARKETING_FAQS } from "@/lib/marketing/data";
import {
  fetchStats,
  fetchHeroStats,
  fetchLeaderboard,
  fetchTeachers,
  fetchTestimonials,
  fetchCenters,
} from "@/lib/marketing/server-data";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { HomeHero } from "@/components/marketing/home/home-hero";
import { ExaminerBand } from "@/components/marketing/home/examiner-band";
import { PartnerMarquee } from "@/components/marketing/shared/partner-marquee";
import { StatsBand } from "@/components/marketing/shared/stats-band";
import { SkillsGrid } from "@/components/marketing/shared/skills-grid";
import { JourneyStepper } from "@/components/marketing/shared/journey-stepper";
import { Leaderboard } from "@/components/marketing/shared/leaderboard";
import { TeacherCard } from "@/components/marketing/shared/teacher-card";
import { TestimonialCard } from "@/components/marketing/shared/testimonial-card";
import { FaqAccordion } from "@/components/marketing/shared/faq-accordion";
import { FinalCta } from "@/components/marketing/shared/final-cta";

export const metadata: Metadata = {
  title: "Realistic IELTS Mock Exams with Real Examiners & Same-Day Results",
  description: SITE.description,
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.domain,
      description: SITE.description,
    },
    {
      "@type": "Product",
      name: "Full Academic IELTS Mock Exam",
      description:
        "A complete 4-skill IELTS mock exam delivered in one day, graded by certified examiners.",
      brand: { "@type": "Brand", name: SITE.name },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "1240" },
      offers: {
        "@type": "Offer",
        price: String(SITE.fullMockPrice),
        priceCurrency: SITE.currency,
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: MARKETING_FAQS.slice(0, 6).map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ],
};

export default async function HomePage() {
  const [stats, heroStats, leaderboard, teachers, testimonials, centers] = await Promise.all([
    fetchStats(),
    fetchHeroStats(),
    fetchLeaderboard(),
    fetchTeachers(),
    fetchTestimonials(),
    fetchCenters(),
  ]);
  const topTeachers = teachers.slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeHero stats={heroStats} />
      <PartnerMarquee centers={centers} />
      <StatsBand stats={stats} />

      {/* Skills */}
      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="The Four Skills"
            title={
              <>
                We didn&apos;t redesign the IELTS test.
                <br className="hidden sm:block" /> We recreated it.
              </>
            }
            subtitle="Every detail — from audio playback rules to timer behaviour — mirrors the real IDP computer-delivered exam."
          />
        </Reveal>
        <div className="mt-12">
          <SkillsGrid />
        </div>
        <Reveal className="mt-10 flex justify-center">
          <CtaButton href="/how-it-works" variant="secondary" withArrow>
            See the full mock-day journey
          </CtaButton>
        </Reveal>
      </Section>

      {/* Journey */}
      <Section className="bg-white">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Mock Day Journey"
            title="One day. Four skills. Your real band."
            subtitle="All scores held until Speaking is graded, then released together."
          />
        </Reveal>
        <div className="mt-16">
          <JourneyStepper />
        </div>
        <Reveal className="mt-14 flex justify-center">
          <CtaButton href="/how-it-works" variant="secondary" withArrow>
            Read the full mock-day guide
          </CtaButton>
        </Reveal>
      </Section>

      {/* Top Students */}
      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="Band Heroes"
            title="Top-scoring candidates this month"
            subtitle="Real results from real exams. Every band verified by certified examiners."
          />
        </Reveal>
        <div className="mt-12">
          <Leaderboard students={leaderboard} />
        </div>
      </Section>

      {/* Top Teachers */}
      <Section className="bg-white">
        <Reveal>
          <SectionHeading
            eyebrow="Meet Your Examiners"
            title="Real certified examiners. Your choice."
            subtitle="Browse, compare, and select who grades your Writing and conducts your Speaking session."
          />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {topTeachers.map((teacher) => (
            <StaggerItem key={teacher.id}>
              <TeacherCard teacher={teacher} />
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal className="mt-10 flex justify-center">
          <Link
            href="/teachers"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-navy-light hover:-translate-y-0.5"
          >
            Browse all examiners <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </Section>

      {/* Testimonials */}
      <Section>
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Student Reviews"
            title="Real results. Real stories."
            subtitle="Every testimonial tied to a verified exam result."
          />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <StaggerItem key={item.id}>
              <TestimonialCard item={item} />
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <ExaminerBand examiners={heroStats.examiners} />

      {/* FAQ */}
      <Section className="bg-white">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="FAQ"
            title="Common questions"
            subtitle="Everything you need to know about booking and sitting an IELTS Mock."
          />
        </Reveal>
        <div className="mx-auto mt-12 max-w-3xl">
          <FaqAccordion faqs={MARKETING_FAQS.slice(0, 6)} defaultOpenId="pause" />
        </div>
      </Section>

      <FinalCta
        title="Ready to find out your real band?"
        subtitle={`Join ${heroStats.candidates} candidates who took the test that prepares you for the test.`}
        primaryLabel={`Book a Full Mock`}
      />
    </>
  );
}
