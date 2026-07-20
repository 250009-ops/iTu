import { BarChart3, BookOpen, Building2, GraduationCap, Users } from "lucide-react";
import { Section, Pill, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

// Product-true feature set — mirrors the /centers page PARTNER_BENEFITS so the
// home teaser only promises what the institution portal actually ships.
const CENTER_FEATURES = [
  {
    icon: Users,
    title: "Bulk enrolments",
    body: "Enrol cohorts from one dashboard — assign mock dates and track every student.",
    accent: "bg-sky-50 text-sky-600",
  },
  {
    icon: BarChart3,
    title: "Cohort reporting",
    body: "Band distributions, skill breakdowns, and improvement trends for your students.",
    accent: "bg-violet-50 text-violet-600",
  },
  {
    icon: BookOpen,
    title: "Student practice hub",
    body: "Enrolled students buy Reading, Listening, and AI Writing packages in their portal.",
    accent: "bg-amber-50 text-amber-700",
  },
  {
    icon: GraduationCap,
    title: "Your examiners",
    body: "Use your own certified teachers or tap into the iTestU examiner network.",
    accent: "bg-emerald-50 text-emerald-600",
  },
] as const;

export function CentersTeaser() {
  return (
    <Section className="bg-slate-50">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <Stagger className="grid grid-cols-2 gap-4">
            {CENTER_FEATURES.map((feature) => (
              <StaggerItem
                key={feature.title}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    feature.accent,
                  )}
                >
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-navy">{feature.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{feature.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>

        <Reveal delay={0.1}>
          <Pill tone="navy">
            <Building2 className="h-3.5 w-3.5" /> For Edu Centers
          </Pill>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Run IELTS prep at scale.
            <br />
            <span className="text-sky-600">Enrol your entire cohort.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            iTestU gives language schools and test-prep centres a dedicated institution portal —
            enrol students, assign mocks, track results, and manage examiners from one place.
          </p>
          <CtaButton href="/centers" variant="primary" size="lg" withArrow className="mt-8">
            Explore for edu centers
          </CtaButton>
        </Reveal>
      </div>
    </Section>
  );
}
