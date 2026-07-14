import Link from "next/link";
import type { PartnerCenter } from "@/lib/marketing/server-data";
import { CenterLogo } from "./center-logo";

// Auto-scrolling row of partner-centre logos, populated dynamically from the
// list of active centres. Renders nothing when there are no partners yet.
export function PartnerMarquee({
  centers,
  heading = "Trusted by leading IELTS centres",
}: {
  centers: PartnerCenter[];
  heading?: string;
}) {
  if (centers.length === 0) return null;

  // Duplicate so the -50% translate loops seamlessly. With very few partners we
  // repeat more times to keep the row full.
  const repeat = centers.length < 5 ? 4 : 2;
  const items = Array.from({ length: repeat }, () => centers).flat();

  return (
    <div className="border-y border-border bg-white py-8">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
        {heading}
      </p>
      <div className="marquee-mask relative mt-6 overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
          {items.map((center, i) => (
            <Link
              key={`${center.id}-${i}`}
              href={`/centers/${center.slug}`}
              className="group inline-flex items-center gap-3 rounded-xl px-2 py-1 transition-colors"
              aria-label={center.name}
            >
              <CenterLogo
                name={center.name}
                logoUrl={center.logoUrl}
                size="sm"
              />
              <span className="text-base font-semibold text-slate-500 transition-colors group-hover:text-navy">
                {center.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
