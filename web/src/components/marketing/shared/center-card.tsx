import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import type { PartnerCenter } from "@/lib/marketing/server-data";
import { CenterLogo } from "./center-logo";

export function CenterCard({ center }: { center: PartnerCenter }) {
  return (
    <Link
      href={`/centers/${center.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-navy/20 hover:shadow-xl"
    >
      <div className="flex items-start gap-4">
        <CenterLogo name={center.name} logoUrl={center.logoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-navy">{center.name}</h3>
          {center.city ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3.5 w-3.5" /> {center.city}
            </p>
          ) : null}
        </div>
      </div>

      {center.bio ? (
        <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
          {center.bio}
        </p>
      ) : (
        <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
          An official iTestU partner centre delivering real computer-delivered
          IELTS mocks with examiner feedback.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Users className="h-3.5 w-3.5 text-emerald-500" />
          {center.studentCount.toLocaleString()}{" "}
          {center.studentCount === 1 ? "student" : "students"}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy transition-colors group-hover:text-brand-red">
          View centre
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
