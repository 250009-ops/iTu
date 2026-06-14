"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Lock } from "lucide-react";
import { PACKAGES, SKILL_META } from "@/lib/marketing/data";
import { ACCENT } from "@/components/marketing/ui/accents";
import { SkillIcon, StarRating } from "@/components/marketing/ui/primitives";
import { cn } from "@/lib/utils";

export function PricingPlans() {
  const [examType, setExamType] = useState<"ACADEMIC" | "GENERAL_TRAINING">("ACADEMIC");

  const full = PACKAGES.find(
    (p) => p.examType === examType && p.skills.length === 4,
  )!;
  const sideCards = PACKAGES.filter((p) => p.skills.length === 1);

  return (
    <div>
      {/* Toggle */}
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-border">
        {(
          [
            ["ACADEMIC", "Academic"],
            ["GENERAL_TRAINING", "General Training"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setExamType(id)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              examType === id ? "bg-navy text-white" : "text-muted hover:text-navy",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Featured full mock */}
        <div className="relative rounded-3xl border-2 border-brand-red bg-navy p-7 text-white shadow-xl sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-red px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                  Most Popular
                </span>
                <span className="rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-medium text-slate-200">
                  {full.examType === "ACADEMIC" ? "Academic" : "General Training"}
                </span>
              </div>
              <h3 className="mt-3 text-2xl font-bold">{full.title}</h3>
            </div>
            <div className="text-right">
              <p className="text-4xl font-extrabold">
                ${full.price}
                <span className="ml-1 text-sm font-medium text-slate-400">{full.currency}</span>
              </p>
              <p className="text-xs text-slate-400">per exam</p>
              <StarRating rating={full.rating} count={full.reviewCount} className="mt-1 justify-end [&_*]:text-slate-300" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {full.skills.map((id) => {
              const meta = SKILL_META[id];
              const accent = ACCENT[meta.accent];
              return (
                <div
                  key={id}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", accent.iconBg)}>
                    <SkillIcon skill={id} className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold">{meta.name}</span>
                </div>
              );
            })}
          </div>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {full.included.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-200">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/mock-exams"
            className="mt-7 flex h-13 items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-red/30 transition-all hover:bg-brand-red-hover hover:-translate-y-0.5"
          >
            Book Full Mock Exam <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Lock className="h-3 w-3" /> Secure Stripe checkout · Instant confirmation
          </p>
        </div>

        {/* Side cards */}
        <div className="space-y-6">
          {sideCards.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h3 className="font-bold text-navy">{pkg.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{pkg.description}</p>
              <p className="mt-4 text-3xl font-extrabold text-navy">
                ${pkg.price}
                <span className="ml-1 text-xs font-medium text-muted">{pkg.currency}</span>
              </p>
              <ul className="mt-4 space-y-2">
                {pkg.included.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/mock-exams"
                className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-navy text-sm font-semibold text-white transition-colors hover:bg-navy-light"
              >
                Book <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
