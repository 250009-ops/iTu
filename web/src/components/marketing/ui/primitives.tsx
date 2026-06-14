import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  BookOpen,
  Headphones,
  Mic,
  PenLine,
  GraduationCap,
  CheckCircle2,
  Star,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillId } from "@/lib/marketing/data";

// ── Decorative blurred gradient glow blob ──────────────────────────────────
export function Glow({
  className,
  color = "rgba(14,165,233,0.35)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
    />
  );
}

// ── Eyebrow pill / badge ────────────────────────────────────────────────────
export function Pill({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "emerald" | "navy" | "onNavy" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        tone === "default" && "bg-slate-100 text-slate-600",
        tone === "emerald" && "bg-emerald-50 text-emerald-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "navy" && "bg-navy/10 text-navy",
        tone === "onNavy" && "bg-white/10 text-slate-200 ring-1 ring-white/15",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Section wrapper with eyebrow / title / subtitle ─────────────────────────
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  onDark = false,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Pill tone={onDark ? "onNavy" : "emerald"}>{eyebrow}</Pill>
      ) : null}
      <h2
        className={cn(
          "text-3xl font-bold tracking-tight sm:text-4xl text-balance",
          onDark ? "text-white" : "text-navy",
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "max-w-2xl text-base leading-relaxed sm:text-lg",
            onDark ? "text-slate-300" : "text-muted",
            align === "center" && "mx-auto",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ── Section container with consistent padding & max width ───────────────────
export function Section({
  children,
  className,
  containerClassName,
  id,
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("relative py-20 sm:py-28", className)}>
      <div className={cn("mx-auto w-full max-w-6xl px-6", containerClassName)}>
        {children}
      </div>
    </section>
  );
}

// ── CTA link styled as a button ─────────────────────────────────────────────
type CtaProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "ghost" | "onNavy";
  size?: "md" | "lg";
  withArrow?: boolean;
};

export function CtaButton({
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  children,
  ...props
}: CtaProps) {
  return (
    <Link
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-13 px-7 py-3.5 text-base",
        variant === "primary" &&
          "bg-brand-red text-white shadow-lg shadow-brand-red/30 hover:bg-brand-red-hover hover:shadow-xl hover:shadow-brand-red/40 hover:-translate-y-0.5",
        variant === "secondary" &&
          "border border-border bg-white text-navy hover:bg-slate-50 hover:-translate-y-0.5",
        variant === "ghost" &&
          "border border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10",
        variant === "onNavy" &&
          "bg-white text-navy hover:bg-slate-100 hover:-translate-y-0.5",
        className,
      )}
      {...props}
    >
      {children}
      {withArrow ? (
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      ) : null}
    </Link>
  );
}

// ── Skill icon mapping ──────────────────────────────────────────────────────
const SKILL_ICONS = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
} as const;

export function SkillIcon({
  skill,
  className,
}: {
  skill: SkillId;
  className?: string;
}) {
  const Icon = SKILL_ICONS[skill];
  return <Icon className={className} strokeWidth={1.75} />;
}

export { GraduationCap, CheckCircle2, Star, ArrowRight };

// ── Star rating ─────────────────────────────────────────────────────────────
export function StarRating({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-3.5 w-3.5",
              i < Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-200 text-slate-200",
            )}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-foreground">{rating.toFixed(1)}</span>
      {count !== undefined ? (
        <span className="text-xs text-muted">({count.toLocaleString()})</span>
      ) : null}
    </div>
  );
}

// ── Avatar (initials) ───────────────────────────────────────────────────────
export function Avatar({
  initials,
  className,
  size = "md",
}: {
  initials: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-light font-semibold text-white",
        size === "sm" && "h-9 w-9 text-xs",
        size === "md" && "h-11 w-11 text-sm",
        size === "lg" && "h-14 w-14 text-base",
        size === "xl" && "h-20 w-20 text-xl",
        className,
      )}
    >
      {initials}
    </div>
  );
}
