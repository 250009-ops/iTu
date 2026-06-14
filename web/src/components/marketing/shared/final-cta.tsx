import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Glow, Pill, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal } from "@/components/marketing/motion/reveal";

export function FinalCta({
  eyebrow = "Ready to test yourself?",
  title,
  subtitle,
  primaryHref = "/mock-exams",
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  primaryHref?: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-navy">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]" />
      <Glow className="left-1/4 top-0 h-72 w-72" color="rgba(227,24,55,0.25)" />
      <Glow className="right-1/4 bottom-0 h-72 w-72" color="rgba(14,165,233,0.2)" />

      <Reveal direction="none" className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-6">
          <Pill tone="onNavy">
            <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
          </Pill>
          <h2 className="text-3xl font-bold tracking-tight text-white text-balance sm:text-5xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="max-w-xl text-lg text-slate-300">{subtitle}</p>
          ) : null}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <CtaButton href={primaryHref} variant="primary" size="lg" withArrow>
              {primaryLabel}
            </CtaButton>
            {secondaryHref && secondaryLabel ? (
              <CtaButton href={secondaryHref} variant="ghost" size="lg">
                {secondaryLabel}
              </CtaButton>
            ) : null}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
