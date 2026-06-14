"use client";

import { useState } from "react";
import { MessageSquare, ShieldCheck, Star } from "lucide-react";
import type { TopTeacher } from "@/lib/marketing/data";
import { ACCENT } from "@/components/marketing/ui/accents";
import { Avatar } from "@/components/marketing/ui/primitives";
import { cn } from "@/lib/utils";

const REVIEWS = [
  { name: "Hana T.", band: 7.5, quote: "Detailed, encouraging feedback. I knew exactly what to fix for my real test." },
  { name: "Omar K.", band: 8, quote: "The criteria breakdown was the clearest I've ever received. Highly recommend." },
  { name: "Lucia R.", band: 7, quote: "Made the speaking session feel like a real conversation. Calmed my nerves completely." },
];

export function TeacherProfileTabs({ teacher }: { teacher: TopTeacher }) {
  const [tab, setTab] = useState<"overview" | "reviews">("overview");
  const accent = ACCENT[teacher.accent];

  return (
    <div>
      <div className="flex gap-2">
        {(["overview", "reviews"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold capitalize transition-colors",
              tab === t ? "bg-navy text-white" : "text-muted hover:text-navy",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold text-navy">About</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">{teacher.longBio}</p>

            <h2 className="mt-8 text-xl font-bold text-navy">Sample feedback</h2>
            <div
              className={cn(
                "mt-4 rounded-2xl border border-l-4 bg-white p-5 shadow-sm",
                accent.softBorder,
              )}
            >
              <p className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", accent.text)}>
                <MessageSquare className="h-3.5 w-3.5" /> {teacher.sampleFeedback.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                &ldquo;{teacher.sampleFeedback.quote}&rdquo;
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-navy">Credentials</h2>
            <div className="mt-4 space-y-2.5">
              {teacher.credentials.map((c) => (
                <div
                  key={c}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm"
                >
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">{c}</span>
                </div>
              ))}
            </div>

            <h2 className="mt-8 text-xl font-bold text-navy">Speciality</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {teacher.speciality.split(" & ").map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.name} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Band {r.band}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground">&ldquo;{r.quote}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3">
                <Avatar initials={r.name.slice(0, 2).toUpperCase()} size="sm" />
                <span className="text-sm font-semibold text-foreground">{r.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
