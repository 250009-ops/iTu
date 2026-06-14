import { Check } from "lucide-react";
import { JOURNEY_STEPS } from "@/lib/marketing/data";
import { ACCENT } from "@/components/marketing/ui/accents";
import { SkillIcon, GraduationCap } from "@/components/marketing/ui/primitives";
import { Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";
import type { SkillId } from "@/lib/marketing/data";

const SKILL_IDS: SkillId[] = ["listening", "reading", "writing", "speaking"];

function StepIcon({ icon }: { icon: string }) {
  if (icon === "check") return <Check className="h-5 w-5" />;
  if (icon === "book") return <GraduationCap className="h-5 w-5" />;
  if (icon === "results") return <GraduationCap className="h-5 w-5" />;
  if (SKILL_IDS.includes(icon as SkillId)) {
    return <SkillIcon skill={icon as SkillId} className="h-5 w-5" />;
  }
  return <Check className="h-5 w-5" />;
}

export function JourneyStepper() {
  return (
    <Stagger className="relative">
      {/* Connecting line (desktop) */}
      <div className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-emerald-300 via-sky-300 to-rose-300 md:block" />
      <ol className="relative grid grid-cols-2 gap-y-8 sm:grid-cols-4 md:grid-cols-7 md:gap-y-0">
        {JOURNEY_STEPS.map((step) => {
          const accent = ACCENT[step.accent];
          return (
            <StaggerItem key={step.id} className="flex flex-col items-center text-center">
              <span
                className={cn(
                  "relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-white shadow-sm",
                  accent.softBorder,
                  accent.text,
                )}
              >
                <StepIcon icon={step.icon} />
              </span>
              <p className="mt-3 text-sm font-bold text-navy">{step.label}</p>
              <p className="mt-0.5 max-w-[8rem] text-[11px] leading-tight text-muted">
                {step.caption}
              </p>
            </StaggerItem>
          );
        })}
      </ol>
    </Stagger>
  );
}
