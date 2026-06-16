import type { ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { Section } from "@/components/marketing/ui/primitives";
import { Reveal } from "@/components/marketing/motion/reveal";

export type LegalSection = {
  id: string;
  heading: string;
  body: ReactNode;
};

export function LegalDoc({
  updated,
  intro,
  sections,
  contactEmail = "support@itestu.uz",
}: {
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
  contactEmail?: string;
}) {
  return (
    <Section className="pt-16">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[220px_1fr]">
        {/* Table of contents */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              On this page
            </p>
            <nav className="mt-4 flex flex-col border-l border-border">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="-ml-px border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted transition-colors hover:border-brand-red hover:text-navy"
                >
                  {s.heading}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Document body */}
        <div className="min-w-0 max-w-2xl">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm">
            <CalendarClock className="h-4 w-4 text-brand-red" />
            <span className="text-muted">
              Last updated{" "}
              <span className="font-semibold text-navy">{updated}</span>
            </span>
          </div>

          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
            {intro}
          </div>

          <div className="mt-12 space-y-12">
            {sections.map((s, i) => (
              <Reveal key={s.id} direction="up">
                <section id={s.id} className="scroll-mt-28">
                  <h2 className="flex items-baseline gap-2 text-xl font-bold text-navy">
                    <span className="text-brand-red">{i + 1}.</span>
                    {s.heading}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
                    {s.body}
                  </div>
                </section>
              </Reveal>
            ))}
          </div>

          <div className="mt-14 rounded-2xl bg-navy p-6 text-white">
            <h3 className="font-bold">Questions about this document?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Contact our team at{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="font-semibold text-white underline underline-offset-2 hover:text-brand-red"
              >
                {contactEmail}
              </a>{" "}
              and we&apos;ll be happy to help.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
