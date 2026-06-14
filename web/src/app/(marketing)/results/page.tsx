import type { Metadata } from "next";
import { Clock, Award, GraduationCap, TrendingUp, MessageSquare } from "lucide-react";
import type { MarketingFaq } from "@/lib/marketing/data";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { FaqAccordion } from "@/components/marketing/shared/faq-accordion";
import { FinalCta } from "@/components/marketing/shared/final-cta";

export const metadata: Metadata = {
  title: "IELTS Mock Results — Criteria-Level Examiner Feedback & Band Report",
  description:
    "See exactly what your IELTS mock results include: four bands plus overall, criteria-level written examiner feedback, and score progression tracking.",
  alternates: { canonical: "/results" },
};

const HOW = [
  { icon: Clock, title: "Same-day release", body: "Listening and Reading are auto-scored instantly. Writing is typically graded within 12 hours. Speaking triggers the unified release once graded.", accent: "text-sky-600 bg-sky-50" },
  { icon: Award, title: "Four bands + overall", body: "You receive individual bands for L, R, W, and S plus your Overall Band Score, calculated as the mean of the four, rounded to the nearest 0.5.", accent: "text-emerald-600 bg-emerald-50" },
  { icon: GraduationCap, title: "Examiner written notes", body: "Your Writing and Speaking examiner provides structured criteria-level feedback — not just scores. This is the most valuable part of the report.", accent: "text-violet-600 bg-violet-50" },
];

const SKILL_BARS: Array<[string, number, string, string]> = [
  ["Listening", 9, "text-sky-600", "bg-sky-500"],
  ["Reading", 8.5, "text-emerald-600", "bg-emerald-500"],
  ["Writing", 8, "text-violet-600", "bg-violet-500"],
  ["Speaking", 8.5, "text-rose-600", "bg-rose-500"],
];

const CRITERIA: Array<[string, number, string]> = [
  ["Task Achievement", 8, "bg-violet-500"],
  ["Coherence & Cohesion", 8, "bg-sky-500"],
  ["Lexical Resource", 8.5, "bg-emerald-500"],
  ["Grammatical Range & Acc.", 7.5, "bg-amber-500"],
];

const IMPROVEMENTS = [
  ["Writing Task 1 overview paragraph", "Synthesise key trends before listing data points."],
  ["Grammatical range — Speaking Part 3", "Use more complex structures: conditionals, passive voice."],
  ["Lexical resource — collocations", "Replace overused adjectives with precise collocations."],
  ["Reading — True/False/Not Given", "Distinguish between 'not stated' and 'contradicted' more carefully."],
];

const BAND_FAQS: MarketingFaq[] = [
  { id: "overall", category: "Results", question: "How is the Overall Band calculated?", answer: "The four skill bands (L, R, W, S) are averaged and rounded to the nearest 0.5. For example, L:9.0 + R:8.5 + W:8.0 + S:8.5 = 34 ÷ 4 = 8.5 Overall." },
  { id: "held", category: "Results", question: "Why are all scores held until Speaking?", answer: "To mirror real IELTS exam behaviour — IDP and British Council release all four bands together after all grading is complete. Seeing partial results before Speaking would influence your performance." },
  { id: "accuracy", category: "Results", question: "How accurate is the Writing grade vs the real test?", answer: "All our examiners hold CELTA or higher and most are current or former IDP/BC certified examiners. Band variance is typically ±0.5, which matches inter-rater reliability in the real exam." },
  { id: "dispute", category: "Results", question: "Can I dispute my band score?", answer: "Yes. If you believe your Writing or Speaking grade is incorrect, you can request a re-mark within 7 days of release. A second examiner reviews the submission independently." },
];

// Score progression data: mock attempts → overall band
const PROGRESSION = [
  { label: "Mock 1", band: 6.0 },
  { label: "Mock 2", band: 6.5 },
  { label: "Mock 3", band: 7.0 },
  { label: "Mock 4", band: 8.5 },
];

function ProgressionChart() {
  const w = 720;
  const h = 240;
  const padX = 40;
  const padY = 30;
  const min = 5;
  const max = 9.5;
  const pts = PROGRESSION.map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / (PROGRESSION.length - 1);
    const y = padY + ((max - p.band) / (max - min)) * (h - padY * 2);
    return { x, y, ...p };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x},${h - padY} L${pts[0].x},${h - padY} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="prog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(227,24,55,0.18)" />
          <stop offset="100%" stopColor="rgba(227,24,55,0)" />
        </linearGradient>
      </defs>
      {[9, 7, 5].map((band) => {
        const y = padY + ((max - band) / (max - min)) * (h - padY * 2);
        return (
          <g key={band}>
            <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={8} y={y + 4} className="fill-slate-400 text-[11px]">{band}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#prog)" />
      <path d={path} fill="none" stroke="#e31837" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={5} fill="#e31837" />
          <circle cx={p.x} cy={p.y} r={9} fill="#e31837" opacity={0.15} />
          <text x={p.x} y={h - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ResultsPage() {
  return (
    <>
      <PageHero
        eyebrow="Results Experience"
        title="See exactly what you get"
        subtitle="Criteria-level feedback from a real examiner. Score history tracking. All four bands released together."
      />

      {/* How results work */}
      <Section className="pt-16">
        <Reveal>
          <SectionHeading
            eyebrow="How Results Work"
            title="Unified release — exactly like the real test"
            subtitle="All scores are held until your Speaking examiner submits their grade. Then all four are released simultaneously."
          />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {HOW.map((c) => (
            <StaggerItem key={c.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.accent}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* Sample report */}
      <Section className="bg-white pt-0">
        <Reveal>
          <SectionHeading eyebrow="Sample Report" title="Your results dashboard" />
        </Reveal>
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Reveal direction="left">
            <div className="overflow-hidden rounded-2xl border border-border shadow-md">
              <div className="bg-navy p-6 text-white sm:p-7">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Full Academic Mock
                    </p>
                    <p className="text-sm text-slate-300">Aisha Karimova · June 9, 2026</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Released
                  </span>
                </div>
                <div className="mt-5 flex items-end gap-8">
                  <div>
                    <p className="text-5xl font-extrabold text-emerald-400">8.5</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Overall Band</p>
                  </div>
                  <div className="grid flex-1 grid-cols-4 gap-3">
                    {SKILL_BARS.map(([name, band, , bar]) => (
                      <div key={name}>
                        <p className="text-[10px] text-slate-400">{name}</p>
                        <p className="text-lg font-bold text-white">{band}</p>
                        <span className="mt-1 block h-1 rounded-full bg-white/15">
                          <span
                            className={`block h-1 rounded-full ${bar}`}
                            style={{ width: `${(band / 9) * 100}%` }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Writing · Examiner feedback — Daniel Whitfield
                </p>
                <div className="mt-3 rounded-xl border border-l-4 border-violet-200 bg-violet-50/40 p-4">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600">
                    <MessageSquare className="h-3.5 w-3.5" /> Feedback
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                    &ldquo;Task 2 demonstrates sophisticated argument development with well-integrated
                    evidence. Lexical range is impressive — varied collocations used accurately. Task 1
                    would benefit from a stronger overview paragraph synthesising key trends before data
                    points.&rdquo;
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CRITERIA.map(([name, band, bar]) => (
                    <div key={name} className="rounded-xl border border-border p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted">{name}</p>
                      <p className="mt-1 text-xl font-bold text-navy">{band}</p>
                      <span className="mt-1 block h-1 rounded-full bg-slate-100">
                        <span className={`block h-1 rounded-full ${bar}`} style={{ width: `${(band / 9) * 100}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="inline-flex items-center gap-1.5 text-sm font-bold text-navy">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Improvement Opportunities
              </p>
              <ol className="mt-4 space-y-3">
                {IMPROVEMENTS.map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs leading-relaxed text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-center">
                <p className="text-sm font-bold text-navy">Targeting Band 9.0?</p>
                <p className="mt-1 text-xs text-muted">
                  Book another mock to track your progress after acting on your feedback.
                </p>
                <a
                  href="/mock-exams"
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg bg-amber-500 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                >
                  Book next mock →
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Score tracking */}
      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="Score Tracking"
            title="Watch your band grow"
            subtitle="Every mock you take is plotted — so you can see exactly how much you've improved and where to focus next."
          />
        </Reveal>
        <Reveal className="mt-10 rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <ProgressionChart />
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
            <TrendingUp className="mr-1 inline h-4 w-4" /> This candidate improved from 6.0 → 8.5 over 4
            mocks — <span className="font-bold">+2.5 band improvement</span>
          </div>
        </Reveal>
      </Section>

      {/* Band FAQ */}
      <Section className="bg-white">
        <Reveal>
          <SectionHeading align="center" eyebrow="Band Scoring FAQ" title="Understanding your band score" />
        </Reveal>
        <div className="mx-auto mt-10 max-w-3xl">
          <FaqAccordion faqs={BAND_FAQS} defaultOpenId="overall" />
        </div>
      </Section>

      <FinalCta
        title="See your own band report"
        subtitle="Book a full mock and receive the same detailed breakdown with criteria-level examiner feedback."
        primaryLabel="Book a Full Mock — $49"
      />
    </>
  );
}
