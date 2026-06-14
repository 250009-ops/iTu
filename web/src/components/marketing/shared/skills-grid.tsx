import { SKILLS } from "@/lib/marketing/data";
import { ACCENT } from "@/components/marketing/ui/accents";
import { SkillIcon } from "@/components/marketing/ui/primitives";
import { Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

export function SkillsGrid() {
  return (
    <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {SKILLS.map((skill) => {
        const accent = ACCENT[skill.accent];
        const isTeacher = skill.grading === "Teacher-graded";
        return (
          <StaggerItem
            key={skill.id}
            className={cn(
              "group flex h-full flex-col rounded-2xl border border-border border-t-4 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl",
              accent.topBorder,
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                accent.iconBg,
              )}
            >
              <SkillIcon skill={skill.id} className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-navy">{skill.name}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{skill.claim}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{skill.duration}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  isTeacher ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700",
                )}
              >
                {skill.grading}
              </span>
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
