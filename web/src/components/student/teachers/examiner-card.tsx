"use client";

import Link from "next/link";
import {
  Calendar,
  MessageSquare,
  ShieldCheck,
  ThumbsUp,
} from "lucide-react";
import type { PublicExaminer } from "@/lib/teachers/map-public-teacher";
import { positiveReviewPercent } from "@/lib/teachers/map-public-teacher";
import { cn } from "@/lib/utils";

function ExaminerAvatar({
  examiner,
  className,
}: {
  examiner: PublicExaminer;
  className?: string;
}) {
  if (examiner.avatarUrl) {
    return (
      <img
        src={examiner.avatarUrl}
        alt=""
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-white",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-navy/10 font-bold text-navy ring-2 ring-white",
        className,
      )}
    >
      {examiner.initials}
    </div>
  );
}

export function ExaminerCard({
  examiner,
  profileHref,
  compact = false,
}: {
  examiner: PublicExaminer;
  profileHref?: string;
  compact?: boolean;
}) {
  const href = profileHref ?? `/student/teachers/${examiner.slug}`;
  const positivePercent = positiveReviewPercent(examiner.rating);
  const highlight =
    examiner.credentials[0] ??
    (examiner.isTopRated ? "Top rated examiner" : "Certified examiner");

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-gray-900">
            {examiner.name}
          </h3>
          {positivePercent > 0 ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
              <span>{positivePercent}% positive reviews</span>
            </p>
          ) : null}
          <p className="mt-1 text-sm text-gray-500">
            {examiner.languages.join(", ")}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            Examiner since {examiner.memberSince}
          </p>
        </div>
        <ExaminerAvatar examiner={examiner} className="h-16 w-16 text-lg" />
      </div>

      <p
        className={cn(
          "mt-4 text-sm leading-relaxed text-gray-600",
          compact ? "line-clamp-3" : "line-clamp-4",
        )}
      >
        {examiner.bio}
      </p>
      <Link
        href={href}
        className="mt-1 self-start text-sm font-semibold text-gray-900 underline underline-offset-2"
      >
        See more
      </Link>

      <div className="mt-4 rounded-xl bg-amber-50/80 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-700">
          Highlights
        </p>
        <div className="mt-2 space-y-1.5">
          <p className="flex items-center gap-2 text-sm text-gray-700">
            <MessageSquare className="h-4 w-4 text-gray-500" />
            {examiner.totalSessions.toLocaleString()}+ sessions
          </p>
          <p className="flex items-center gap-2 text-sm text-gray-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {highlight}
          </p>
        </div>
      </div>

      <Link
        href={href}
        className="mt-5 block w-full rounded-full bg-gray-900 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-gray-800"
      >
        View profile
      </Link>
    </article>
  );
}

export { ExaminerAvatar };
