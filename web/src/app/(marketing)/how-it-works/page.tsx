import type { Metadata } from "next";
import {
  Check,
  ShieldCheck,
  Wifi,
  Camera,
  Monitor,
  AlertTriangle,
  Clock,
  GraduationCap,
} from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading, SkillIcon } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import type { SkillId } from "@/lib/marketing/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How It Works — Everything That Happens on IELTS Mock Day",
  description:
    "From booking to results — a complete walkthrough of the IELTS Mock exam experience: check-in, the four skills, exam integrity rules, and a typical mock-day timeline.",
  alternates: { canonical: "/how-it-works" },
};

type Step = {
  id: string;
  label: string;
  badge: string;
  badgeTone: string;
  icon: SkillId | "book" | "check" | "results";
  accent: string;
  desc: string;
  items: string[];
};

const STEPS: Step[] = [
  {
    id: "book", label: "Book Your Mock", badge: "Day before", badgeTone: "bg-emerald-50 text-emerald-700",
    icon: "book", accent: "border-emerald-200 text-emerald-600",
    desc: "Choose Academic or General Training, select your package, and pick your Writing/Speaking examiner from our certified directory.",
    items: ["Browse examiner profiles by speciality, rating, and availability", "Select your preferred date and Speaking time slot", "Secure checkout — confirmation within 60 seconds", "Pre-exam preparation guide sent to your email"],
  },
  {
    id: "check-in", label: "Check-In", badge: "30 min before", badgeTone: "bg-sky-50 text-sky-700",
    icon: "check", accent: "border-sky-200 text-sky-600",
    desc: "Identity verification and system check to ensure your exam environment meets the required standards.",
    items: ["Photo ID verification (passport or national ID)", "Webcam, microphone, and internet speed check", "Exam room scan — no notes, no extra screens", "Examiner briefing and rules acknowledgment"],
  },
  {
    id: "listening", label: "Listening", badge: "~32 min", badgeTone: "bg-sky-50 text-sky-700",
    icon: "listening", accent: "border-sky-200 text-sky-600",
    desc: "Exactly 4 parts, 40 questions. Audio plays once, server-side — no rewind, no pause, no client-side control.",
    items: ["Part 1: Conversation (8 questions)", "Part 2: Monologue — talk or announcement (8 questions)", "Part 3: Discussion between 2–4 speakers (8 questions)", "Part 4: Academic monologue, lecture or talk (16 questions)", "Auto-scored immediately at submission"],
  },
  {
    id: "reading", label: "Reading", badge: "60 min", badgeTone: "bg-emerald-50 text-emerald-700",
    icon: "reading", accent: "border-emerald-200 text-emerald-600",
    desc: "3 passages of increasing difficulty. CBT interface matches the real exam layout — highlight tool, annotation strip, question navigator.",
    items: ["Academic: 3 long-form academic passages (~2,500 words total)", "GT: 2 shorter sections + 1 longer passage", "40 questions across all types (MCQ, matching, T/F/NG, completion)", "Strict 60-minute server-authoritative timer", "Auto-scored immediately at submission"],
  },
  {
    id: "writing", label: "Writing", badge: "60 min", badgeTone: "bg-violet-50 text-violet-700",
    icon: "writing", accent: "border-violet-200 text-violet-600",
    desc: "Two tasks in the same 60-minute window. Live word counter. Spell-check disabled. Server timer — no extensions.",
    items: ["Academic Task 1: Describe a graph, chart, diagram, or process (≥150 words)", "GT Task 1: Write a formal/semi-formal/informal letter (≥150 words)", "Task 2 (both): Write a discursive essay responding to a statement (≥250 words)", "Graded by your assigned examiner against all 4 official criteria", "Feedback delivered alongside your band score in the results release"],
  },
  {
    id: "speaking", label: "Speaking", badge: "11–14 min", badgeTone: "bg-rose-50 text-rose-700",
    icon: "speaking", accent: "border-rose-200 text-rose-600",
    desc: "Live video session with your assigned certified examiner. Structured in 3 parts exactly as the real test.",
    items: ["Part 1: Introduction and interview (4–5 min) — familiar topics", "Part 2: Individual long turn with cue card (3–4 min + 1 min preparation)", "Part 3: Two-way discussion on abstract themes (4–5 min)", "Session recorded for examiner reference", "Written criteria-level notes provided alongside your score"],
  },
  {
    id: "results", label: "Results Released", badge: "Same day", badgeTone: "bg-emerald-50 text-emerald-700",
    icon: "results", accent: "border-emerald-200 text-emerald-600",
    desc: "All four band scores released simultaneously after the Speaking examiner submits their grade. You'll receive an email notification.",
    items: ["Overall Band Score (rounded to nearest 0.5)", "Individual bands: Listening, Reading, Writing, Speaking", "Full examiner feedback for Writing and Speaking", "Score progression chart (if you've taken multiple mocks)", "Improvement opportunities panel with ranked next steps"],
  },
];

function StepIcon({ icon }: { icon: Step["icon"] }) {
  if (icon === "check") return <Check className="h-5 w-5" />;
  if (icon === "book" || icon === "results") return <GraduationCap className="h-5 w-5" />;
  return <SkillIcon skill={icon} className="h-5 w-5" />;
}

const INTERFACES: Array<{ skill: SkillId; url: string; label: string; caption: string }> = [
  { skill: "listening", url: "app.itestu.uz/exam/listening", label: "Listening", caption: "Audio waveform strip, progress bar, question navigator. Audio plays exactly once — the play button is disabled after initial play." },
  { skill: "reading", url: "app.itestu.uz/exam/reading", label: "Reading", caption: "Split-screen: passage on the left, questions on the right. Highlight tool, paragraph labels, and a sticky question navigator strip at the bottom." },
  { skill: "writing", url: "app.itestu.uz/exam/writing", label: "Writing", caption: "Two tasks in one session. Task 1 prompt on the left, text area on the right. Live word counter always visible. Spell-check disabled." },
  { skill: "speaking", url: "app.itestu.uz/exam/speaking", label: "Speaking", caption: "Live video call with your assigned examiner. Examiner view on the left, cue card (Part 2) displayed on screen. Preparation timer during Part 2." },
];

const RULES = [
  { icon: ShieldCheck, title: "ID verification required", body: "Government-issued photo ID checked at check-in. Name must match booking." },
  { icon: Wifi, title: "Stable internet required", body: "Minimum 5 Mbps. Wired preferred. Disconnect for >5 min may invalidate the session." },
  { icon: Camera, title: "Webcam on throughout", body: "Webcam must remain active during all sections. Cover or obstruction = disqualification." },
  { icon: Monitor, title: "Single screen only", body: "Only the exam browser window permitted. No virtual machines, no screen sharing." },
  { icon: AlertTriangle, title: "No external materials", body: "No notes, books, or reference materials visible. Clean desk required for Speaking." },
  { icon: Clock, title: "Server-authoritative timers", body: "Timers run server-side. Refreshing the page or losing connection does not pause or reset time." },
];

const TIMELINE: Array<[string, string, string, string]> = [
  ["08:30", "Check-in opens", "30 min", "text-sky-600"],
  ["09:00", "Listening begins", "~32 min", "text-sky-600"],
  ["09:40", "10-min break", "10 min", "text-muted"],
  ["09:50", "Reading begins", "60 min", "text-emerald-600"],
  ["10:50", "10-min break", "10 min", "text-muted"],
  ["11:00", "Writing begins", "60 min", "text-violet-600"],
  ["12:00", "Lunch break", "60 min", "text-muted"],
  ["13:00", "Speaking slots", "11–14 min", "text-rose-600"],
  ["~15:00", "Results released", "Same day", "text-emerald-600"],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How It Works"
        title="Everything that happens on Mock Day"
        subtitle="From booking to results — a complete walkthrough of the IELTS Mock exam experience."
      />

      {/* Journey */}
      <Section className="pt-16">
        <Reveal>
          <SectionHeading eyebrow="Step by Step" title="The Mock-Day Journey" />
        </Reveal>
        <div className="relative mt-12">
          <div className="absolute bottom-0 left-6 top-0 w-px bg-gradient-to-b from-emerald-300 via-sky-300 to-rose-300 sm:left-7" />
          <Stagger className="space-y-8">
            {STEPS.map((step) => (
              <StaggerItem key={step.id} className="relative pl-16 sm:pl-20">
                <span
                  className={cn(
                    "absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white shadow-sm sm:h-14 sm:w-14",
                    step.accent,
                  )}
                >
                  <StepIcon icon={step.icon} />
                </span>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-navy">{step.label}</h3>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", step.badgeTone)}>
                    {step.badge}
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{step.desc}</p>
                <div className="mt-4 grid gap-2.5 rounded-2xl border border-border bg-white p-5 shadow-sm sm:grid-cols-2">
                  {step.items.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-sm text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </p>
                  ))}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      {/* Interface mockups */}
      <Section className="bg-white">
        <Reveal>
          <SectionHeading
            eyebrow="The Interface"
            title="Built to match the real exam"
            subtitle="Every screen is modelled on the official computer-delivered IELTS environment."
          />
        </Reveal>
        <Stagger className="mt-12 grid gap-6 md:grid-cols-2">
          {INTERFACES.map((iface) => (
            <StaggerItem key={iface.skill}>
              <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                <div className="bg-[#0f1830] p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-3 truncate rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                      {iface.url}
                    </span>
                  </div>
                  <div className="mt-4 flex h-28 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
                      <SkillIcon skill={iface.skill} className="h-5 w-5" /> {iface.label}
                    </span>
                  </div>
                </div>
                <p className="bg-white p-4 text-sm leading-relaxed text-muted">{iface.caption}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* Integrity rules */}
      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="Exam Integrity"
            title="Rules you must follow"
            subtitle="These rules mirror real IELTS exam conditions. Violations may result in score invalidation."
          />
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule) => (
            <StaggerItem key={rule.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <rule.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy">{rule.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{rule.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* Timeline table */}
      <Section className="bg-white">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Sample Timeline"
            title="A typical mock day"
            subtitle="Times are approximate and may vary based on your Speaking slot."
          />
        </Reveal>
        <Reveal className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                <th className="px-5 py-3.5">Time</th>
                <th className="px-5 py-3.5">Activity</th>
                <th className="px-5 py-3.5 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TIMELINE.map(([time, activity, dur, color], i) => (
                <tr key={activity + i} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className={cn("px-5 py-3 font-mono text-xs font-bold", color)}>{time}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{activity}</td>
                  <td className="px-5 py-3 text-right text-muted">{dur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>

      <FinalCta
        title="Ready to sit your mock?"
        subtitle="Book a full 4-skill mock with a certified examiner. Same-day results."
        primaryLabel="Book a Full Mock — 56,000 so'm"
      />
    </>
  );
}
