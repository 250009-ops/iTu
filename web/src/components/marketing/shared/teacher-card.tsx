import Link from "next/link";
import { Star, Play, Globe, ShieldCheck } from "lucide-react";
import type { TopTeacher } from "@/lib/marketing/data";
import { ACCENT } from "@/components/marketing/ui/accents";
import { Avatar } from "@/components/marketing/ui/primitives";
import { cn } from "@/lib/utils";

export function TeacherCard({ teacher }: { teacher: TopTeacher }) {
  const accent = ACCENT[teacher.accent];

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-border border-t-4 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl",
        accent.topBorder,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar initials={teacher.initials} size="lg" />
        <div className="min-w-0 flex-1">
          {teacher.isTopRated ? (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Top Rated
            </span>
          ) : null}
          <h3 className="truncate font-bold text-navy">{teacher.name}</h3>
          <div className="mt-0.5 flex items-center gap-1.5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3.5 w-3.5",
                    i < Math.round(teacher.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-200 text-slate-200",
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-foreground">{teacher.rating}</span>
            <span className="text-xs text-muted">({teacher.reviewCount.toLocaleString()})</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", accent.softBg, accent.text)}>
          {teacher.speciality}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <Play className="h-3 w-3" /> {teacher.totalSessions.toLocaleString()} sessions
        </span>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{teacher.bio}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {teacher.credentials.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
          >
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> {c}
          </span>
        ))}
      </div>

      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
        <Globe className="h-3.5 w-3.5" /> {teacher.languages.join(", ")}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Link
          href={`/teachers/${teacher.slug}`}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-navy transition-colors hover:bg-slate-50"
        >
          View profile
        </Link>
        <Link
          href="/mock-exams"
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors",
            accent.softBg,
            accent.text,
            "hover:brightness-95",
          )}
        >
          Book →
        </Link>
      </div>
    </article>
  );
}
