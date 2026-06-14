import Link from "next/link";
import { Check, Lock, ArrowRight } from "lucide-react";
import type { MockPackage } from "@/lib/marketing/data";
import { SKILL_META } from "@/lib/marketing/data";
import { ACCENT } from "@/components/marketing/ui/accents";
import { SkillIcon, StarRating } from "@/components/marketing/ui/primitives";
import { cn } from "@/lib/utils";

// Compact pricing-style card (used on pricing & mock-exams grid).
export function PackageCard({ pkg }: { pkg: MockPackage }) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl",
        pkg.mostPopular ? "border-brand-red ring-1 ring-brand-red/30" : "border-border",
      )}
    >
      {pkg.mostPopular ? (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-red px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
          Most Popular
        </span>
      ) : null}

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-navy">{pkg.title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{pkg.description}</p>

      <div className="mt-4 flex items-end gap-1">
        <span className="text-4xl font-extrabold text-navy">${pkg.price}</span>
        <span className="pb-1 text-xs font-medium text-muted">{pkg.currency}</span>
      </div>
      <StarRating rating={pkg.rating} count={pkg.reviewCount} className="mt-2" />

      <div className="mt-5 flex flex-wrap gap-2">
        {pkg.skills.map((id) => {
          const meta = SKILL_META[id];
          const accent = ACCENT[meta.accent];
          return (
            <span
              key={id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                accent.softBg,
                accent.text,
              )}
            >
              <SkillIcon skill={id} className="h-3.5 w-3.5" />
              {meta.name}
            </span>
          );
        })}
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {pkg.included.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm text-muted">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>

      <Link
        href={`/mock-exams?package=${pkg.slug}`}
        className={cn(
          "mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5",
          pkg.mostPopular
            ? "bg-brand-red text-white shadow-lg shadow-brand-red/30 hover:bg-brand-red-hover"
            : "bg-navy text-white hover:bg-navy-light",
        )}
      >
        Book Now <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted">
        <Lock className="h-3 w-3" /> Secure payment · Instant confirmation
      </p>
    </article>
  );
}
