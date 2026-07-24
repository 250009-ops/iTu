"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Clock, Play, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { COPY, fullMockCtaLabel } from "@/lib/marketing/data";
import type { HeroStats } from "@/lib/marketing/server-data";
import { PRACTICE_MARKETING_VISIBLE } from "@/lib/practice/feature-flags";
import { Glow } from "@/components/marketing/ui/primitives";
import { WaveDivider } from "@/components/marketing/ui/page-hero";
import { EASE } from "@/components/marketing/motion/reveal";

const EMPTY_HERO_STATS: HeroStats = {
  candidates: null,
  mocks: null,
  rating: null,
  examiners: null,
  candidatesRaw: 0,
  examinersRaw: 0,
  mocksRaw: 0,
  ratingRaw: null,
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

function heroTrustLine(stats: HeroStats): string | null {
  const parts: string[] = [];
  if (stats.candidates) parts.push(`${stats.candidates} candidates`);
  if (stats.rating) parts.push(`${stats.rating}★ examiner rating`);
  if (stats.examiners) parts.push(`${stats.examiners} certified examiners`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function HomeHero({ stats = EMPTY_HERO_STATS }: { stats?: HeroStats }) {
  const trustLine = heroTrustLine(stats);

  return (
    <section className="relative overflow-hidden bg-navy pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]" />
      <Glow className="-left-32 top-10 h-96 w-96" color="rgba(14,165,233,0.3)" />
      <Glow className="right-0 bottom-0 h-96 w-96" color="rgba(139,92,246,0.25)" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1fr_1fr]">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.span
            variants={item}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 ring-1 ring-white/15"
          >
            <Check className="h-3.5 w-3.5 text-emerald-400" /> Realistic computer-delivered mock
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            {COPY.hero.headline1}
            <br />
            <span className="bg-gradient-to-r from-sky-400 to-sky-200 bg-clip-text text-transparent">
              {COPY.hero.headline2}
            </span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
            {PRACTICE_MARKETING_VISIBLE
              ? "Full 4-skill mocks with certified examiners — plus Reading, Listening, and AI Writing practice packages you can buy anytime."
              : "Full 4-skill mocks with certified examiners — realistic computer-delivered conditions and real band feedback."}
          </motion.p>

          <motion.p
            variants={item}
            className="mt-4 inline-flex max-w-md items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm leading-snug text-emerald-100"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            New students: free Listening + Reading mocks. Invite 2 friends for another free skill mock.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/mock-exams"
              className="group inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-brand-red px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-red/30 transition-all hover:bg-brand-red-hover hover:-translate-y-0.5"
            >
              {fullMockCtaLabel()}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/register/student"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              Claim free mocks
            </Link>
            {PRACTICE_MARKETING_VISIBLE ? (
              <Link
                href="/practice"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-base font-semibold text-slate-200 transition-colors hover:text-white"
              >
                Practice packages
              </Link>
            ) : (
              <Link
                href="/how-it-works"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-base font-semibold text-slate-200 transition-colors hover:text-white"
              >
                <Play className="h-4 w-4" /> How mocks work
              </Link>
            )}
          </motion.div>

          {trustLine ? (
            <motion.p variants={item} className="mt-8 text-sm text-slate-300">
              <span className="font-semibold text-white">{trustLine}</span>
            </motion.p>
          ) : (
            <motion.p variants={item} className="mt-8 text-sm text-slate-400">
              {PRACTICE_MARKETING_VISIBLE
                ? "Mocks with certified examiners · Practice subscriptions between test days"
                : "Free Reading & Listening for new students · Results when all skills are graded"}
            </motion.p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.25 }}
          className="relative"
        >
          <ExamMockup />
        </motion.div>
      </div>

      <WaveDivider className="absolute inset-x-0 bottom-0 h-20 text-white" />
    </section>
  );
}

function ExamMockup() {
  return (
    <div className="relative mx-auto max-w-lg animate-float">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1830] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <BrandMark size="sm" textClassName="text-xs font-semibold text-white" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Listening
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="h-3 w-3" /> 11:42
            </span>
          </div>
        </div>

        <div className="px-5 py-9">
          <div className="flex items-end justify-center gap-1">
            {[6, 12, 20, 28, 18, 24, 32, 22, 14, 26, 30, 16, 10, 22, 28, 18, 12, 8].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-sky-500 to-sky-300"
                style={{ height: h * 1.4 }}
              />
            ))}
          </div>

          <p className="mt-9 text-xs font-medium text-slate-300">
            1. The speaker mentions the lecture will cover
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {[
              ["A) Three main theories", false],
              ["B) Four research stages", true],
              ["C) Two case studies", false],
              ["D) Five historical periods", false],
            ].map(([label, active]) => (
              <div
                key={label as string}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-3 text-[11px] ${
                  active
                    ? "border-sky-500/60 bg-sky-500/15 text-white"
                    : "border-white/10 text-slate-400"
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                    active ? "border-sky-400 bg-sky-400" : "border-slate-500"
                  }`}
                >
                  {active ? <Check className="h-2.5 w-2.5 text-navy" /> : null}
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.7 }}
        className="absolute -bottom-8 -right-4 w-44 rounded-2xl border border-border bg-white p-4 shadow-xl sm:-right-8"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Band Result</p>
        <p className="mt-1 text-4xl font-extrabold text-emerald-600">
          8.5 <span className="text-sm font-medium text-muted">Overall</span>
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1 border-t border-border pt-2 text-center text-[10px]">
          {[
            ["L", "9", "text-sky-600"],
            ["R", "8.5", "text-emerald-600"],
            ["W", "8", "text-violet-600"],
            ["S", "8.5", "text-rose-600"],
          ].map(([letter, band, color]) => (
            <div key={letter}>
              <p className={`font-bold ${color}`}>{letter}</p>
              <p className="font-semibold text-foreground">{band}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
