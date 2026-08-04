import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SITE, MARKETING_FAQS, fullMockCtaLabel } from "@/lib/marketing/data";
import {
  fetchStats,
  fetchHeroStats,
  fetchLeaderboard,
  fetchTeachers,
  fetchTestimonials,
  fetchCenters,
  fetchPackages,
} from "@/lib/marketing/server-data";
import type { MockPackage } from "@/lib/marketing/data";
import { candidatesCtaCopy } from "@/lib/marketing/social-proof";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { HomeHero } from "@/components/marketing/home/home-hero";
import { ExaminerBand } from "@/components/marketing/home/examiner-band";
import { CentersTeaser } from "@/components/marketing/home/centers-teaser";
import { PartnerMarquee } from "@/components/marketing/shared/partner-marquee";
import { StatsBand } from "@/components/marketing/shared/stats-band";
import { SkillsGrid } from "@/components/marketing/shared/skills-grid";
import { JourneyStepper } from "@/components/marketing/shared/journey-stepper";
import { Leaderboard } from "@/components/marketing/shared/leaderboard";
import { TeacherCard } from "@/components/marketing/shared/teacher-card";
import { TestimonialCard } from "@/components/marketing/shared/testimonial-card";
import { FaqAccordion } from "@/components/marketing/shared/faq-accordion";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { MarketingDesktopAppSection } from "@/components/marketing/shared/desktop-app-section";
import { PracticeOfferingSection } from "@/components/marketing/shared/practice-offering-section";
import { StudentOffersSection } from "@/components/marketing/shared/student-offers-section";

export const metadata: Metadata = {
  title: `${SITE.name} — Realistic IELTS Mock Exams with Real Examiners`,
  description: SITE.description,
  alternates: { canonical: "/" },
};

function fullMockOfferPrice(packages: MockPackage[]) {
  const full = packages.find(
    (p) => p.examType === "ACADEMIC" && p.skills.length === 4,
  );
  return full?.fromPrice ?? full?.price ?? SITE.fullMockPrice;
}

function buildJsonLd(rating: string | null, packages: MockPackage[]) {
  const product: Record<string, unknown> = {
    "@type": "Product",
    name: "Full Academic IELTS Mock Exam",
    description:
      "A complete 4-skill IELTS mock exam delivered in one day, graded by certified examiners.",
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      price: String(fullMockOfferPrice(packages)),
      priceCurrency: SITE.currency,
      availability: "https://schema.org/InStock",
    },
  };

  if (rating) {
    product.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE.name,
        alternateName: [...SITE.alternateNames],
        url: SITE.domain,
        logo: `${SITE.domain}/icon-512.png`,
        foundingDate: String(SITE.foundedYear),
        description: SITE.description,
      },
      {
        "@type": "WebSite",
        name: SITE.name,
        alternateName: [...SITE.alternateNames],
        url: SITE.domain,
      },
      product,
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
}

export default async function HomePage() {
  const [stats, heroStats, leaderboard, teachers, testimonials, centers, packages] =
    await Promise.all([
      fetchStats(),
      fetchHeroStats(),
      fetchLeaderboard(),
      fetchTeachers(),
      fetchTestimonials(),
      fetchCenters(),
      fetchPackages(),
    ]);
  const topTeachers = teachers.slice(0, 4);
  const fullMockLabel = fullMockCtaLabel(packages);
  const jsonLd = buildJsonLd(heroStats.rating, packages);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeHero stats={heroStats} fullMockLabel={fullMockLabel} />
      {centers.length > 0 ? <PartnerMarquee centers={centers} /> : null}
      <StatsBand stats={stats} />
      <StudentOffersSection className="bg-white pt-0" />

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
            subtitle="Every detail — from audio playback rules to timer behaviour — mirrors the real computer-delivered exam."
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

      <PracticeOfferingSection className="bg-slate-50 pt-0" />

      <MarketingDesktopAppSection />

      {leaderboard.length > 0 ? (
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
      ) : null}

      {topTeachers.length > 0 ? (
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
      ) : null}

      {testimonials.length > 0 ? (
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
      ) : null}

      <CentersTeaser />

      <ExaminerBand examiners={heroStats.examiners} />

      <Section className="bg-white">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="FAQ"
            title="Common questions"
            subtitle={`Everything you need to know about booking and sitting an ${SITE.name} mock exam.`}
          />
        </Reveal>
        <div className="mx-auto mt-12 max-w-3xl">
          <FaqAccordion faqs={MARKETING_FAQS.slice(0, 6)} defaultOpenId="pause" />
        </div>
      </Section>

      <FinalCta
        title="Ready to find out your real band?"
        subtitle={candidatesCtaCopy(heroStats.candidates)}
        primaryLabel={fullMockLabel}
      />
    </>
  );
}
