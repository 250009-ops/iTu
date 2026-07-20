"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { resolvePracticeCta } from "@/lib/marketing/practice-cta";
import { cn } from "@/lib/utils";
import { CtaButton } from "@/components/marketing/ui/primitives";

type Variant = "primary" | "secondary" | "ghost" | "onNavy";
type Size = "md" | "lg";

type Props = {
  variant?: Variant;
  size?: Size;
  withArrow?: boolean;
  className?: string;
  /** Override default guest label */
  guestLabel?: string;
  /** Override default student label */
  studentLabel?: string;
  /** Static children — if omitted, label comes from resolvePracticeCta */
  children?: ReactNode;
};

const buttonBase = {
  primary:
    "bg-brand-red text-white shadow-lg shadow-brand-red/30 hover:bg-brand-red-hover hover:shadow-xl hover:shadow-brand-red/40 hover:-translate-y-0.5",
  secondary:
    "border border-border bg-white text-navy hover:bg-slate-50 hover:-translate-y-0.5",
  ghost:
    "border border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10",
  onNavy: "bg-white text-navy hover:bg-slate-100 hover:-translate-y-0.5",
} as const;

export function PracticeCtaButton({
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  guestLabel,
  studentLabel,
  children,
}: Props) {
  const { session, isAuthenticated, isHydrated } = useAuth();
  const [hint, setHint] = useState<string | null>(null);

  if (!isHydrated) {
    return (
      <span
        className={cn(
          "inline-flex rounded-xl bg-white/10",
          size === "lg" ? "h-13 w-48" : "h-11 w-40",
          className,
        )}
        aria-hidden
      />
    );
  }

  const target = resolvePracticeCta(session, isAuthenticated, {
    guest: guestLabel,
    student: studentLabel,
  });

  if (target.kind === "link") {
    return (
      <CtaButton
        href={target.href}
        variant={variant}
        size={size}
        withArrow={withArrow}
        className={className}
      >
        {children ?? target.label}
      </CtaButton>
    );
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-2 sm:items-start", className)}>
      <button
        type="button"
        onClick={() => setHint(target.hint)}
        className={cn(
          "group inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
          size === "md" && "h-11 px-5 text-sm",
          size === "lg" && "h-13 px-7 py-3.5 text-base",
          buttonBase[variant],
        )}
        aria-describedby={hint ? "practice-cta-hint" : undefined}
      >
        {children ?? target.label}
        {withArrow ? (
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        ) : null}
      </button>
      {hint ? (
        <p
          id="practice-cta-hint"
          role="status"
          className={cn(
            "max-w-sm text-left text-xs leading-relaxed",
            variant === "ghost" || variant === "onNavy"
              ? "text-slate-300"
              : "text-muted",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
