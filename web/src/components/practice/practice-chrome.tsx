"use client";

import Link from "next/link";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  GraduationCap,
  Radar,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GlossLanguage } from "@/components/practice/glossed-passage";

export type PracticeModeId = "practice" | "skim" | "scan" | "guided";

type ModeMeta = {
  label: string;
  tagline: string;
  icon: ComponentType<{ className?: string }>;
  /** Chip / badge surface. */
  chip: string;
  /** Icon tile surface. */
  tile: string;
  /** Banner surface for in-flow guidance. */
  banner: string;
  /** Progress + accent colour. */
  bar: string;
};

export const PRACTICE_MODE_META: Record<PracticeModeId, ModeMeta> = {
  practice: {
    label: "Practice",
    tagline: "Answer under exam conditions",
    icon: Clock,
    chip: "border-rose-200 bg-rose-50 text-brand-red",
    tile: "border-rose-200 bg-rose-50 text-brand-red",
    banner: "border-rose-200 bg-rose-50 text-rose-900",
    bar: "bg-navy",
  },
  skim: {
    label: "Skim Trainer",
    tagline: "Prove main ideas before questions unlock",
    icon: Zap,
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    tile: "border-emerald-200 bg-emerald-50 text-emerald-700",
    banner: "border-emerald-200 bg-emerald-50 text-emerald-800",
    bar: "bg-emerald-600",
  },
  scan: {
    label: "Scan Trainer",
    tagline: "Race to locate details in the passage",
    icon: Radar,
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    tile: "border-amber-200 bg-amber-50 text-amber-700",
    banner: "border-amber-200 bg-amber-50 text-amber-900",
    bar: "bg-amber-500",
  },
  guided: {
    label: "Guided Coach",
    tagline: "Strategy steps with I do → We do → You do",
    icon: GraduationCap,
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    tile: "border-blue-200 bg-blue-50 text-blue-700",
    banner: "border-blue-200 bg-blue-50 text-blue-900",
    bar: "bg-blue-600",
  },
};

export function practiceModeMeta(mode: string | null | undefined): ModeMeta {
  return PRACTICE_MODE_META[(mode ?? "practice") as PracticeModeId] ??
    PRACTICE_MODE_META.practice;
}

/**
 * Full-height shell for a practice screen. Sits inside the portal `<main>`,
 * which already has a definite height, so inner panes can own their scroll.
 */
export function PracticeScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Sticky bar at the top of the content area: exit, mode chip, title, tools. */
export function PracticeTopBar({
  exitHref,
  exitLabel = "Exit",
  modeLabel,
  modeChipClassName,
  title,
  subtitle,
  children,
}: {
  exitHref: string;
  exitLabel?: string;
  modeLabel?: string;
  modeChipClassName?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 lg:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={exitHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate-100 hover:text-navy"
        >
          <X className="h-3.5 w-3.5" />
          {exitLabel}
        </Link>
        {modeLabel && (
          <span
            className={cn(
              "shrink-0 rounded-xl border px-2.5 py-1 text-[11px] font-semibold",
              modeChipClassName,
            )}
          >
            {modeLabel}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-navy">{title}</p>
          {subtitle && (
            <p className="truncate text-[11px] text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </header>
  );
}

/** Answered / total counter with a slim progress track. */
export function AnsweredPill({
  answered,
  total,
}: {
  answered: number;
  total: number;
}) {
  const complete = total > 0 && answered >= total;
  const pct = total > 0 ? Math.min(100, (answered / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          complete ? "text-emerald-600" : "text-muted",
        )}
      >
        {complete ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5" />
        )}
        {answered}/{total}
      </span>
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 sm:block">
        <span
          className={cn(
            "block h-full rounded-full transition-all duration-300",
            complete ? "bg-emerald-500" : "bg-navy",
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

export function TimerPill({
  seconds,
  warnUnder = 300,
}: {
  seconds: number;
  warnUnder?: number;
}) {
  const warn = seconds <= warnUnder;
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = String(Math.max(0, seconds) % 60).padStart(2, "0");
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold tabular-nums",
        warn
          ? "border-rose-200 bg-rose-50 text-brand-red"
          : "border-amber-200 bg-amber-50 text-amber-700",
      )}
    >
      <Timer className="h-3.5 w-3.5" />
      {mins}:{secs}
    </span>
  );
}

export function LangToggle({
  value,
  onChange,
}: {
  value: GlossLanguage;
  onChange: (lang: GlossLanguage) => void;
}) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-0.5">
      {(["en", "uz", "ru"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={cn(
            "rounded-lg px-2 py-1 text-[11px] font-semibold uppercase transition-colors",
            value === lang
              ? "bg-navy text-white"
              : "text-muted hover:text-navy",
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}

/**
 * Two-pane content area. Desktop shows both panes side by side; mobile swaps
 * between them with a tab strip so the content area is never cramped.
 */
export function PracticeSplit({
  left,
  right,
  leftLabel = "Passage",
  rightLabel = "Questions",
  leftWidthClassName = "lg:w-1/2",
  leftPadded = true,
}: {
  left: ReactNode;
  right: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  leftWidthClassName?: string;
  leftPadded?: boolean;
}) {
  const [pane, setPane] = useState<"left" | "right">("left");

  return (
    <>
      <div className="flex shrink-0 border-b border-slate-200 bg-white lg:hidden">
        {(
          [
            ["left", leftLabel],
            ["right", rightLabel],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPane(id)}
            className={cn(
              "flex-1 border-b-2 py-2.5 text-sm transition-colors",
              pane === id
                ? "border-brand-red font-semibold text-navy"
                : "border-transparent text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "min-w-0 flex-col overflow-hidden border-slate-200 lg:flex lg:border-r",
            leftWidthClassName,
            pane === "left" ? "flex w-full" : "hidden",
          )}
        >
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              leftPadded && "px-4 py-5 lg:px-6",
            )}
          >
            {left}
          </div>
        </div>

        <div
          className={cn(
            "min-w-0 flex-1 flex-col overflow-hidden lg:flex",
            pane === "right" ? "flex" : "hidden",
          )}
        >
          {right}
        </div>
      </div>
    </>
  );
}

/** Section banner used for gate guidance and degraded-pack notices. */
export function PracticeBanner({
  icon: Icon,
  children,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-b px-4 py-2.5 text-sm font-medium lg:px-5",
        className,
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** Centered outcome card (skim/scan complete, empty states, fallbacks). */
export function PracticeResultCard({
  icon: Icon,
  iconClassName,
  title,
  description,
  children,
  footer,
  wide,
}: {
  icon?: ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 lg:p-8">
      <div
        className={cn(
          "w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm lg:p-8",
          wide ? "max-w-xl" : "max-w-md",
        )}
      >
        {Icon && (
          <span
            className={cn(
              "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
              iconClassName ?? "bg-slate-100 text-navy",
            )}
          >
            <Icon className="h-6 w-6" />
          </span>
        )}
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
        {children}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
