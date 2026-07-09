"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Headphones,
  Mic,
  PenLine,
  Play,
  Shield,
  User,
} from "lucide-react";
import { useStudentMockDayData } from "@/contexts/student-mock-day-context";
import { SpeakingSlotDialog } from "@/components/student/mock-day/speaking-slot-dialog";
import { speakingJoinAccess } from "@/lib/speaking/slot-access";
import { cn } from "@/lib/utils";

type SectionStatus = "completed" | "in_progress" | "locked" | "ready";

function StatusBadge({ status }: { status: SectionStatus }) {
  if (status === "completed") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700"
        style={{ fontSize: "11px" }}
      >
        <CheckCircle size={11} />
        Complete
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-semibold text-sky-700"
        style={{ fontSize: "11px" }}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
        In progress
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700"
        style={{ fontSize: "11px" }}
      >
        Ready
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-semibold text-gray-500"
      style={{ fontSize: "11px" }}
    >
      Scheduled
    </span>
  );
}

export function SectionCards() {
  const { data, refresh } = useStudentMockDayData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [speakingSlotOpen, setSpeakingSlotOpen] = useState(false);

  if (!data) return null;
  const isMissed = data.status === "missed";
  const { sections, speaking, sessionCode, hasSpeaking } = data;
  const speakingDone = speaking.status === "completed";
  const slotAccess = speakingJoinAccess(speaking.scheduledAt);
  const canJoinSpeaking = slotAccess.allowed && !speakingDone;

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const icons = {
          listening: Headphones,
          reading: BookOpen,
          writing: PenLine,
        };
        const Icon = icons[section.id as keyof typeof icons];
        const isOpen = expanded === section.id;

        return (
          <div
            key={section.id}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <div
              className="h-0.5"
              style={{
                background: `linear-gradient(90deg, ${section.color}, ${section.color}33)`,
              }}
            />
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: section.color }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
                      {section.name}
                    </h3>
                    <StatusBadge status={section.status as SectionStatus} />
                  </div>
                  <p className="mt-0.5 text-gray-500" style={{ fontSize: "13px" }}>
                    {section.detail}
                  </p>
                  <p
                    className="mt-1 flex items-center gap-1 text-gray-400"
                    style={{ fontSize: "12px" }}
                  >
                    <Clock size={12} />
                    {section.timeRange}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {"score" in section.result && (
                  <div
                    className="min-w-[7.5rem] rounded-xl border px-4 py-2.5 text-center"
                    style={{
                      background: `${section.color}0d`,
                      borderColor: `${section.color}30`,
                    }}
                  >
                    <p className="font-black text-gray-900" style={{ fontSize: "15px" }}>
                      {section.result.score}
                    </p>
                    <p className="text-gray-500" style={{ fontSize: "11px" }}>
                      {section.result.label}
                    </p>
                  </div>
                )}
                {"status" in section.result && (
                  <div
                    className="min-w-[7.5rem] rounded-xl border px-4 py-2.5 text-center"
                    style={{
                      background: `${section.color}0d`,
                      borderColor: `${section.color}30`,
                    }}
                  >
                    <p className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
                      {section.result.status}
                    </p>
                    <p className="text-gray-500" style={{ fontSize: "11px" }}>
                      {section.result.sub}
                    </p>
                    {"examiner" in section.result &&
                      typeof section.result.examiner === "string" && (
                      <p
                        className="mt-1 flex items-center justify-center gap-1 text-gray-500"
                        style={{ fontSize: "10px" }}
                      >
                        <User size={10} />
                        {section.result.examiner}
                      </p>
                    )}
                  </div>
                )}
                {section.status === "in_progress" ? (
                  <Link
                    href={`/exam/${sessionCode}/${section.id}`}
                    className="flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2 font-semibold text-white hover:bg-[#243660]"
                    style={{ fontSize: "13px" }}
                  >
                    <Play size={13} fill="white" />
                    Resume
                  </Link>
                ) : section.status === "ready" ? (
                  <Link
                    href={`/exam/${sessionCode}/${section.id}`}
                    className="flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2 font-semibold text-white hover:bg-[#243660]"
                    style={{ fontSize: "13px" }}
                  >
                    <Play size={13} fill="white" />
                    Start
                  </Link>
                ) : section.status === "locked" ? (
                  <span
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-400"
                    style={{ fontSize: "13px" }}
                  >
                    <Shield size={13} />
                    Locked
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700"
                    style={{ fontSize: "13px" }}
                  >
                    <CheckCircle size={13} />
                    Completed
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : section.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-50"
                >
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {hasSpeaking && (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border-2 bg-white shadow-md",
          speakingDone ? "border-emerald-200" : "border-rose-200",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between border-b px-5 py-2.5",
            speakingDone
              ? "border-emerald-100 bg-gradient-to-r from-emerald-50 to-emerald-50/60"
              : "border-rose-100 bg-gradient-to-r from-rose-50 to-rose-50/60",
          )}
        >
          <div className="flex items-center gap-2">
            {speakingDone ? (
              <CheckCircle size={12} className="text-emerald-600" />
            ) : (
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            )}
            <span
              className={cn(
                "font-bold tracking-wide",
                speakingDone ? "text-emerald-700" : "text-rose-700",
              )}
              style={{ fontSize: "11px" }}
            >
              {speakingDone
                ? "SPEAKING MODULE · COMPLETE"
                : "ACTION REQUIRED · SPEAKING MODULE"}
            </span>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 font-semibold",
              speakingDone
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700",
            )}
            style={{ fontSize: "11px" }}
          >
            {speakingDone ? "Submitted" : `${speaking.scheduledLabel} today`}
          </span>
        </div>

        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
              <Mic size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
                  Speaking
                </h3>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-semibold",
                    speakingDone
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-sky-100 text-sky-700",
                  )}
                  style={{ fontSize: "11px" }}
                >
                  {speakingDone
                    ? "Complete"
                    : `Scheduled · ${speaking.scheduledLabel}`}
                </span>
              </div>
              <p className="mt-0.5 text-gray-500" style={{ fontSize: "13px" }}>
                {speaking.detail}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <User size={14} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900" style={{ fontSize: "13px" }}>
                    {speaking.examiner}
                  </p>
                  <p className="text-gray-500" style={{ fontSize: "11px" }}>
                    {speaking.examinerTitle}
                  </p>
                </div>
                <span
                  className="ml-2 flex items-center gap-1 text-gray-400"
                  style={{ fontSize: "11px" }}
                >
                  <Clock size={11} />
                  {speaking.timeRange}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {speakingDone ? (
              <span
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 font-semibold text-emerald-700"
                style={{ fontSize: "13px" }}
              >
                <CheckCircle size={14} />
                Completed
              </span>
            ) : isMissed ? (
              <span
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-400"
                style={{ fontSize: "13px" }}
              >
                <Shield size={13} />
                Locked
              </span>
            ) : data.needsSpeakingSlot ? (
              <button
                type="button"
                onClick={() => setSpeakingSlotOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 font-semibold text-white hover:bg-rose-700"
                style={{ fontSize: "13px" }}
              >
                <CalendarClock size={14} />
                Select examiner availability
              </button>
            ) : (
              <>
                <Link
                  href={`/exam/${sessionCode}/speaking`}
                  aria-disabled={!canJoinSpeaking}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white",
                    canJoinSpeaking
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "pointer-events-none bg-rose-300",
                  )}
                  style={{ fontSize: "13px" }}
                >
                  <Play size={14} fill="white" />
                  {slotAccess.tooEarly
                    ? "Join opens 5 min before"
                    : "Join Session"}
                </Link>
                <Link
                  href={`/exam/${sessionCode}/check-in`}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 font-semibold text-rose-700 hover:bg-rose-50"
                  style={{ fontSize: "13px" }}
                >
                  <Shield size={14} />
                  Check-in First
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-rose-100 bg-rose-50/30 px-5 py-3">
          <p
            className="mb-2 font-bold tracking-wider text-gray-400"
            style={{ fontSize: "10px" }}
          >
            CHECKLIST
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {speaking.checklist.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2"
                style={{ fontSize: "12px" }}
              >
                {item.done ? (
                  <CheckCircle size={14} className="shrink-0 text-emerald-500" />
                ) : (
                  <Circle size={14} className="shrink-0 text-gray-300" />
                )}
                <span className={item.done ? "font-medium text-emerald-700" : "text-gray-500"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {speakingSlotOpen && data.speakingTeacherId && (
        <SpeakingSlotDialog
          enrollmentId={data.enrollmentId}
          mockDateIso={data.mockDateIso}
          teacherId={data.speakingTeacherId}
          examinerName={speaking.examiner}
          allowFutureDates={data.flexibleStart}
          onClose={() => setSpeakingSlotOpen(false)}
          onDone={() => void refresh()}
        />
      )}
    </div>
  );
}
