"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Headphones,
  Lock,
  Mic,
  PenLine,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MockDayShellHeader } from "@/components/student/mock-day/mock-day-shell-header";
import { defaultExamRules } from "@/lib/student/constants";
import {
  mockDayPreparationChecklist,
  mockDayPreviewSchedule,
  mockDayPreviewSections,
} from "@/lib/student/mock-day-preview";

const navyGradient =
  "linear-gradient(135deg, #0a1628 0%, #1B2A4A 60%, #1e3a70 100%)";

const dotTexture = {
  backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
  backgroundSize: "28px 28px",
};

const sectionIcons = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
} as const;

export function MockDayEmptyState() {
  return (
    <div>
      <MockDayShellHeader subtitle="Your exam-day command center — book a mock to activate" />

      <div className="relative text-white" style={{ background: navyGradient }}>
        <div className="absolute inset-0 opacity-[0.04]" style={dotTexture} />
        <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-200"
              >
                <CalendarDays size={14} />
                No mock scheduled
              </span>
              <h2
                className="mt-4 font-black tracking-tight"
                style={{ fontSize: "26px", letterSpacing: "-0.02em" }}
              >
                Book a mock to unlock your exam day
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-blue-200/90">
                Once booked, this hub becomes your live control centre — section
                progress, check-in, speaking countdown, and examiner details all
                appear here on mock day.
              </p>
              <Link href="/student/browse" className="mt-6 inline-block">
                <Button
                  size="lg"
                  className="bg-white text-navy hover:bg-slate-100"
                >
                  Browse &amp; Book a Mock
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-md">
              {mockDayPreviewSections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center"
                >
                  <Lock size={14} className="mx-auto text-blue-300/70" />
                  <p className="mt-2 text-xs font-semibold">{section.name}</p>
                  <p className="mt-0.5 text-[10px] text-blue-300/80">Locked</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-7 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Shield size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-amber-900" style={{ fontSize: "13px" }}>
                <span className="font-bold">Exam-day rules preview:</span>{" "}
                {defaultExamRules.join(" · ")}
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
                  Your exam sections
                </h2>
                <span className="text-xs text-muted">Preview — unlocks after booking</span>
              </div>
              <div className="space-y-4">
                {mockDayPreviewSections.map((section) => {
                  const Icon = sectionIcons[section.id];
                  return (
                    <div
                      key={section.id}
                      className="overflow-hidden rounded-2xl border border-gray-100 bg-white opacity-75 shadow-sm"
                    >
                      <div
                        className="h-0.5"
                        style={{
                          background: `linear-gradient(90deg, ${section.color}, ${section.color}33)`,
                        }}
                      />
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-4">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                            style={{ background: section.color }}
                          >
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className="font-bold text-gray-900"
                                style={{ fontSize: "15px" }}
                              >
                                {section.name}
                              </h3>
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-semibold text-gray-500"
                                style={{ fontSize: "11px" }}
                              >
                                <Lock size={10} />
                                Scheduled
                              </span>
                            </div>
                            <p
                              className="mt-0.5 text-gray-500"
                              style={{ fontSize: "13px" }}
                            >
                              {section.detail}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock size={14} />
                          Available on mock day
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Activity size={16} className="text-gray-500" />
                <h2 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
                  Typical mock-day schedule
                </h2>
              </div>
              <ol className="space-y-0">
                {mockDayPreviewSchedule.map((item, index) => (
                  <li
                    key={item.id}
                    className={`flex gap-3 ${"isBreak" in item && item.isBreak ? "opacity-50" : ""}`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 bg-white" />
                      {index < mockDayPreviewSchedule.length - 1 && (
                        <div
                          className="w-0.5 flex-1 bg-gray-200"
                          style={{ minHeight: 14 }}
                        />
                      )}
                    </div>
                    <div className="pb-3.5">
                      <p
                        className="font-semibold text-gray-500"
                        style={{ fontSize: "13px" }}
                      >
                        {item.title}
                      </p>
                      <p className="text-gray-400" style={{ fontSize: "12px" }}>
                        {item.detail}
                        {item.time ? ` · ${item.time}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
                Before mock day
              </h2>
              <p className="mt-1 text-xs text-muted">
                Complete this checklist before your scheduled exam.
              </p>
              <ul className="mt-4 space-y-2.5">
                {mockDayPreparationChecklist.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-gray-600"
                  >
                    <Circle size={14} className="mt-0.5 shrink-0 text-gray-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex gap-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />
                <div>
                  <p className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
                    Ready to start?
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    Full Academic Mock includes all four skills on one calendar
                    day with certified examiner grading.
                  </p>
                  <Link href="/student/browse" className="mt-3 inline-block">
                    <Button variant="danger" size="sm">
                      Book Full Mock
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
