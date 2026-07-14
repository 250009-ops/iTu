import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck, Users } from "lucide-react";
import type { PartnerCenter } from "@/lib/marketing/server-data";
import { ACCENT } from "@/components/marketing/ui/accents";
import type { AccentColor } from "@/lib/marketing/data";
import { CenterLogo } from "./center-logo";
import { formatSocialCount } from "@/lib/marketing/social-proof";
import { cn } from "@/lib/utils";

const ACCENT_CYCLE: AccentColor[] = ["sky", "emerald", "violet", "rose"];

function accentFor(id: string): AccentColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % ACCENT_CYCLE.length;
  return ACCENT_CYCLE[hash] ?? "sky";
}

export function CenterCard({ center }: { center: PartnerCenter }) {
  const accent = ACCENT[accentFor(center.id)];
  const studentLabel = formatSocialCount(center.studentCount);
  const bio =
    center.bio?.trim() ||
    "An official iTestU Edu Center delivering real computer-delivered IELTS mocks with certified examiner feedback.";

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-border border-t-4 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl",
        accent.topBorder,
      )}
    >
      <div className="flex items-start gap-3">
        <CenterLogo name={center.name} size="md" />
        <div className="min-w-0 flex-1">
          <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck className="h-3 w-3" /> Official Partner
          </span>
          <h3 className="truncate font-bold text-navy">{center.name}</h3>
          {center.city ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3.5 w-3.5" /> {center.city}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", accent.softBg, accent.text)}>
          Edu Center
        </span>
        {studentLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <Users className="h-3 w-3" />
            {studentLabel} students
          </span>
        ) : null}
      </div>

      <p className="mt-3 line-clamp-4 min-h-[4.5rem] flex-1 text-sm leading-relaxed text-muted">
        {bio}
      </p>

      <div className="mt-5 flex items-center gap-2">
        <Link
          href={`/centers/${center.slug}`}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-navy transition-colors hover:bg-slate-50"
        >
          View centre
        </Link>
        <Link
          href={`/centers/${center.slug}`}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors",
            accent.softBg,
            accent.text,
            "hover:brightness-95",
          )}
        >
          Join <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
