import { BookOpen, Headphones, PenLine, Sparkles } from "lucide-react";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { PracticeCtaButton } from "@/components/marketing/shared/practice-cta-button";
import { PRODUCT_CLAIMS, PRACTICE_OFFERINGS } from "@/lib/marketing/data";
import { cn } from "@/lib/utils";

const ICONS = {
  "reading-passages": BookOpen,
  "reading-drills": BookOpen,
  "listening-sections": Headphones,
  "listening-drills": Headphones,
  "ai-writing": PenLine,
} as const;

type Props = {
  className?: string;
  showHeading?: boolean;
};

export function PracticeOfferingSection({ className, showHeading = true }: Props) {
  return (
    <Section className={cn("bg-white", className)}>
      {showHeading ? (
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Practice subscriptions"
            title="Drill between mocks — on your schedule"
            subtitle={PRODUCT_CLAIMS.practice}
          />
        </Reveal>
      ) : null}

      <Stagger className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", showHeading ? "mt-12" : "")}>
        {PRACTICE_OFFERINGS.map((item) => {
          const Icon = ICONS[item.id as keyof typeof ICONS] ?? Sparkles;
          return (
            <StaggerItem
              key={item.id}
              className="rounded-2xl border border-border bg-slate-50/60 p-6 shadow-sm"
            >
              <span
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center rounded-xl",
                  item.accent,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </StaggerItem>
          );
        })}
      </Stagger>

      <Reveal className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
        <PracticeCtaButton
          variant="primary"
          withArrow
          guestLabel="Create account & buy practice"
          studentLabel="Open practice shop"
        />
        <CtaButton href="/practice" variant="secondary">
          Compare mock vs practice
        </CtaButton>
      </Reveal>
    </Section>
  );
}
