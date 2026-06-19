"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock, Zap } from "lucide-react";
import { useStudentMockDayData } from "@/contexts/student-mock-day-context";

const navyGradient =
  "linear-gradient(135deg, #0a1628 0%, #1B2A4A 60%, #1e3a70 100%)";

const dotTexture = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
  backgroundSize: "28px 28px",
};

export function CurrentStatusBanner() {
  const { data } = useStudentMockDayData();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!data) return;
    const total =
      data.countdown.hours * 3600 +
      data.countdown.minutes * 60 +
      data.countdown.seconds;
    setSeconds(total);
  }, [data]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!data) return null;

  const {
    progressPct,
    modulesComplete,
    totalModules,
    currentPhase,
    moduleRail,
    sessionCode,
    countdownLabel,
    checkInCompleted,
  } = data;

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return (
    <div className="relative text-white" style={{ background: navyGradient }}>
      <div className="absolute inset-0 opacity-[0.04]" style={dotTexture} />
      <div className="relative mx-auto max-w-7xl px-6 py-7 lg:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="relative shrink-0">
              <svg width="100" height="100" className="-rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth="8"
                  strokeDasharray={`${progressPct * 2.64} 264`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-black" style={{ fontSize: "24px", lineHeight: 1 }}>
                  {progressPct}%
                </span>
                <span className="text-blue-300" style={{ fontSize: "10px" }}>
                  done
                </span>
              </div>
            </div>

            <div>
              <span
                className="inline-block rounded-full bg-sky-500/20 px-2.5 py-0.5 font-bold tracking-wide text-sky-300"
                style={{ fontSize: "10px" }}
              >
                {currentPhase.badge}
              </span>
              <p className="mt-2 text-blue-200" style={{ fontSize: "13px" }}>
                {modulesComplete} of {totalModules} modules complete
              </p>
              <h2
                className="mt-1 font-black"
                style={{ fontSize: "20px", letterSpacing: "-0.02em" }}
              >
                {currentPhase.headline}
              </h2>
              <p className="mt-1 max-w-xl text-blue-200/80" style={{ fontSize: "13px" }}>
                {currentPhase.message}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-3 xl:items-end">
            <p
              className="font-semibold tracking-wider text-blue-300"
              style={{ fontSize: "10px" }}
            >
              {countdownLabel ?? "TIME UNTIL MOCK START"}
            </p>
            <div className="flex gap-2">
              {[
                { n: String(hrs).padStart(2, "0"), label: "Hrs" },
                { n: String(mins).padStart(2, "0"), label: "Min" },
                { n: String(secs).padStart(2, "0"), label: "Sec" },
              ].map((box) => (
                <div key={box.label} className="text-center">
                  <div
                    className="rounded-lg bg-white/15 px-3 py-2 font-black tabular-nums"
                    style={{ fontSize: "18px", minWidth: "44px" }}
                  >
                    {box.n}
                  </div>
                  <p className="mt-1 text-blue-300" style={{ fontSize: "10px" }}>
                    {box.label}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href={`/exam/${sessionCode}/check-in`}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background: checkInCompleted
                  ? "rgba(255,255,255,0.15)"
                  : "linear-gradient(135deg, #E31837, #c01230)",
                fontSize: "14px",
              }}
            >
              <Zap size={16} />
              {checkInCompleted ? "Review Check-in" : "Enter Exam · Check-in"}
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 border-t border-white/10 pt-4 sm:grid-cols-4">
          {moduleRail.map((m, i) => (
            <div
              key={m.key}
              className={`px-4 ${i > 0 ? "border-l border-white/10" : ""}`}
            >
              <div className="flex items-center gap-2">
                {m.done ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Clock size={14} className="animate-pulse text-rose-400" />
                )}
                <span className="font-semibold" style={{ fontSize: "13px" }}>
                  {m.label}
                </span>
              </div>
              <p className="mt-0.5 text-blue-200" style={{ fontSize: "12px" }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
