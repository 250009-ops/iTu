import Link from "next/link";
import { Gift, Users } from "lucide-react";
import { PRODUCT_CLAIMS } from "@/lib/marketing/data";
import { Section, SectionHeading, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

const OFFERS = [
  {
    icon: Gift,
    eyebrow: "New students",
    title: "Free Reading + Listening mocks",
    body: PRODUCT_CLAIMS.welcomeFreeRl,
    accent: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    cta: { href: "/register/student", label: "Create free account" },
  },
  {
    icon: Users,
    eyebrow: "Invite friends",
    title: "2 invites → free Reading or Listening",
    body: `${PRODUCT_CLAIMS.referralBonus} Share by email invite from your student dashboard — friends open the link, sign up as usual, and it counts.`,
    accent: "bg-sky-50 text-sky-700 ring-sky-100",
    cta: { href: "/register/student", label: "Join & invite by email" },
  },
] as const;

export function StudentOffersSection({
  className,
}: {
  className?: string;
}) {
  return (
    <Section className={cn(className)}>
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Student bonuses"
          title="Start free. Earn another mock by inviting friends."
          subtitle="Real computer-delivered Listening and Reading — not generic online quizzes."
        />
      </Reveal>

      <Stagger className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {OFFERS.map((offer) => (
          <StaggerItem
            key={offer.title}
            className="flex h-full flex-col rounded-2xl border border-border bg-white p-6 shadow-sm"
          >
            <span
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1",
                offer.accent,
              )}
            >
              <offer.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
              {offer.eyebrow}
            </p>
            <h3 className="mt-1 text-lg font-bold text-navy">{offer.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              {offer.body}
            </p>
            <Link
              href={offer.cta.href}
              className="mt-5 inline-flex text-sm font-semibold text-navy underline-offset-2 hover:underline"
            >
              {offer.cta.label}
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="mt-10 flex justify-center">
        <CtaButton href="/register/student" variant="primary" size="lg" withArrow>
          Claim your free mocks
        </CtaButton>
      </Reveal>
    </Section>
  );
}
