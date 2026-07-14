"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileCheck2,
  LifeBuoy,
  RefreshCw,
  Sparkles,
  Trophy,
  UserCog,
} from "lucide-react";
import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

function centerInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type Step = {
  title: string;
  caption: string;
  state: "done" | "current" | "upcoming";
};

export function WaitingApprovalView({
  centerName,
}: {
  centerName: string;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const steps: Step[] = [
    {
      title: "Joined via Telegram link",
      caption: "Completed",
      state: "done",
    },
    {
      title: "Email verified & password set",
      caption: "Completed",
      state: "done",
    },
    {
      title: `${centerName} approves your account`,
      caption: "In review · usually within 1–4 hours",
      state: "current",
    },
    {
      title: "Mock assigned — ready to begin",
      caption: "",
      state: "upcoming",
    },
  ];

  const expectations = [
    {
      icon: UserCog,
      text: `${centerName} assigns you a mock exam and an examiner`,
    },
    { icon: CalendarClock, text: "You get an email with your exam date and section times" },
    { icon: Sparkles, text: "Sit the full CD IELTS mock here on this platform" },
    { icon: Trophy, text: "Band scores released same-day for L/R, within 24 h for W/S" },
  ];

  function handleCheckStatus() {
    setChecking(true);
    // A refresh re-runs the layout gate; if the center approved, it routes on.
    router.refresh();
    window.setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* Left brand / status panel */}
      <aside className="relative flex flex-col justify-between overflow-hidden bg-navy px-8 py-10 text-white lg:px-12">
        <div className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <BrandMarkIcon size="md" />
          <div>
            <p className="text-sm font-bold leading-tight">itestu</p>
            <p className="text-xs text-slate-400">Centre Student</p>
          </div>
        </div>

        <div className="relative">
          <div className="relative inline-flex">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-2xl font-bold text-white shadow-lg">
              {centerInitials(centerName)}
            </div>
            <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-4 border-navy bg-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </span>
          </div>

          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5" />
            Account verified
          </span>

          <h1 className="mt-4 text-3xl font-bold leading-tight">
            Waiting for center approval
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            <span className="font-semibold text-slate-200">{centerName}</span>{" "}
            will review your registration and grant you access. You will receive
            an email when approved.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            Request submitted · waiting for review
          </div>
        </div>

        <div className="relative text-xs text-slate-500">
          Need help? Reach your center directly or contact platform support.
        </div>
      </aside>

      {/* Right progress panel */}
      <section className="flex items-center justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Your progress
          </p>

          <ol className="mt-6 space-y-1">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              return (
                <li key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                        step.state === "done" &&
                          "border-emerald-500 bg-emerald-500 text-white",
                        step.state === "current" &&
                          "border-amber-400 bg-amber-50 text-amber-600",
                        step.state === "upcoming" &&
                          "border-slate-200 bg-white text-slate-300",
                      )}
                    >
                      {step.state === "done" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : step.state === "current" ? (
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                      )}
                    </span>
                    {!isLast && (
                      <span
                        className={cn(
                          "my-1 w-0.5 flex-1",
                          step.state === "done"
                            ? "bg-emerald-300"
                            : "bg-slate-200",
                        )}
                        style={{ minHeight: 28 }}
                      />
                    )}
                  </div>
                  <div className={cn("pb-6", isLast && "pb-0")}>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        step.state === "upcoming"
                          ? "text-slate-400"
                          : step.state === "current"
                            ? "text-amber-700"
                            : "text-navy",
                      )}
                    >
                      {step.title}
                    </p>
                    {step.caption && (
                      <p
                        className={cn(
                          "mt-0.5 flex items-center gap-1 text-xs",
                          step.state === "current"
                            ? "text-amber-600"
                            : "text-emerald-600",
                        )}
                      >
                        {step.state === "current" && (
                          <Clock className="h-3 w-3" />
                        )}
                        {step.caption}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 rounded-2xl border border-border bg-slate-50/70 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-navy">
              <Sparkles className="h-4 w-4 text-amber-500" />
              After approval — what to expect
            </p>
            <ul className="mt-4 space-y-3">
              {expectations.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.text}
                    className="flex items-center gap-3 text-sm text-slate-600"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-navy ring-1 ring-inset ring-border">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {item.text}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checking}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
            >
              <RefreshCw
                className={cn("h-4 w-4", checking && "animate-spin")}
              />
              Check status
            </button>
            <a
              href="mailto:support@itestu.uz"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-navy transition-colors hover:bg-slate-50"
            >
              <LifeBuoy className="h-4 w-4" />
              Contact support
            </a>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
            <FileCheck2 className="h-3.5 w-3.5" />
            We&apos;ll email you the moment {centerName} approves your account.
          </p>
        </div>
      </section>
    </div>
  );
}
