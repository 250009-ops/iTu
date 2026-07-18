"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, ShieldCheck, Star } from "lucide-react";
import { ExaminerAvatar } from "@/components/student/teachers/examiner-card";
import type { PublicExaminer } from "@/lib/teachers/map-public-teacher";
import { positiveReviewPercent } from "@/lib/teachers/map-public-teacher";
import { STUDENT_VIEW_PATHS } from "@/lib/student/routes";
import { cn } from "@/lib/utils";

export function TeacherProfilePanel({ teacher }: { teacher: PublicExaminer }) {
  const reviews = teacher.reviews;
  const hasReviews = reviews.length > 0;
  const tabs = hasReviews ? (["overview", "reviews"] as const) : (["overview"] as const);
  const [tab, setTab] = useState<"overview" | "reviews">("overview");
  const positivePercent = positiveReviewPercent(teacher.rating);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <ExaminerAvatar examiner={teacher} className="h-20 w-20 text-xl" />
            <div>
              {teacher.isTopRated ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Top rated
                </span>
              ) : null}
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{teacher.name}</h1>
              <p className="mt-1 text-sm text-gray-500">{teacher.speciality}</p>
              {positivePercent > 0 ? (
                <p className="mt-2 text-sm text-gray-600">
                  {positivePercent}% positive · {teacher.reviewCount} reviews ·{" "}
                  {teacher.totalSessions.toLocaleString()} sessions
                </p>
              ) : null}
              <p className="mt-1 text-sm text-gray-500">
                {teacher.languages.join(", ")} · Examiner since {teacher.memberSince}
              </p>
            </div>
          </div>
          <Link
            href={`${STUDENT_VIEW_PATHS.browse}?book=1`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90"
          >
            Book a mock
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold capitalize transition-colors",
                tab === t ? "bg-navy text-white" : "text-gray-500 hover:text-navy",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="mt-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {teacher.longBio}
              </p>
            </div>

            {teacher.credentials.length > 0 ? (
              <div>
                <h2 className="text-lg font-bold text-gray-900">Credentials</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {teacher.credentials.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      <ShieldCheck className="h-3 w-3 text-emerald-600" /> {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <h2 className="text-lg font-bold text-gray-900">Sample feedback</h2>
              <div className="mt-3 rounded-xl border border-l-4 border-l-violet-400 bg-gray-50 p-4">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                  <MessageSquare className="h-3.5 w-3.5" />{" "}
                  {teacher.sampleFeedback.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {teacher.sampleFeedback.quote}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{review.name}</p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {review.quote}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
