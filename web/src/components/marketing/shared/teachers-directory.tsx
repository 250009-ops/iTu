"use client";

import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import type { TeacherSpeciality, TopTeacher } from "@/lib/marketing/data";
import { TeacherCard } from "@/components/marketing/shared/teacher-card";
import { Avatar } from "@/components/marketing/ui/primitives";
import { CtaButton } from "@/components/marketing/ui/primitives";
import { cn } from "@/lib/utils";

type Filter = "All" | TeacherSpeciality;
const FILTERS: Filter[] = ["All", "Writing", "Speaking", "Writing & Speaking"];

export function TeachersDirectory({ teachers = [] }: { teachers?: TopTeacher[] }) {
  const [filter, setFilter] = useState<Filter>("All");

  if (teachers.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
        <p className="text-sm leading-relaxed text-muted">
          Certified examiners are joining the platform. Check back soon, or apply to become an
          examiner yourself.
        </p>
        <CtaButton href="/register/teacher" className="mt-6" withArrow>
          Apply as an examiner
        </CtaButton>
      </div>
    );
  }

  const visible =
    filter === "All" ? teachers : teachers.filter((t) => t.speciality === filter);

  const topRated = teachers.filter((t) => t.isTopRated);

  return (
    <div>
      {topRated.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Top Rated
          </span>
          {topRated.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-sm font-medium text-navy shadow-sm"
            >
              <Avatar initials={t.initials} size="sm" className="h-6 w-6 text-[10px]" />
              {t.name}
              {t.rating > 0 ? (
                <span className="text-xs text-amber-600">{t.rating}★</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className={cn("flex flex-wrap items-center gap-2", topRated.length > 0 && "mt-8")}>
        <span className="mr-1 text-sm font-medium text-muted">Speciality:</span>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f
                ? "bg-navy text-white"
                : "bg-white text-muted ring-1 ring-border hover:text-navy",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((teacher) => (
          <TeacherCard key={teacher.id} teacher={teacher} />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          No examiners match this filter.{" "}
          <Link href="/register/teacher" className="font-semibold text-navy underline-offset-4 hover:underline">
            Apply to join
          </Link>
        </p>
      ) : null}
    </div>
  );
}
