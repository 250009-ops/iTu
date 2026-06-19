"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ExternalLink,
  Headphones,
  Mail,
  MessageCircle,
  Phone,
  Zap,
} from "lucide-react";
import { useStudentMockDayData } from "@/contexts/student-mock-day-context";
import { useToast } from "@/components/ui/toast";
import { RescheduleDialog } from "@/components/student/mock-day/reschedule-dialog";

const navyGradient =
  "linear-gradient(135deg, #0a1628 0%, #1B2A4A 60%, #1e3a70 100%)";

const dotTexture = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
  backgroundSize: "28px 28px",
};

const SUPPORT_PHONE = "+18004358701";
const PROCTOR_EMAIL = "support@itestu.uz";

export function MockDaySidebar() {
  const { data, refresh } = useStudentMockDayData();
  const { toast } = useToast();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  if (!data) return null;
  const { checkIn, speakingTip, sessionCode, hasSpeaking, checkInCompleted } = data;
  const canReschedule = data.state === "enrolled";
  const speakingDone = data.speaking.status === "completed";
  const showCheckIn = !checkInCompleted || (hasSpeaking && !speakingDone);

  const supportActions: Record<string, () => void> = {
    "Open Chat": () =>
      toast("Live chat", {
        description: "Connecting you to a support agent…",
        variant: "info",
      }),
    Call: () => {
      window.location.href = `tel:${SUPPORT_PHONE}`;
    },
    Email: () => {
      window.location.href = `mailto:${PROCTOR_EMAIL}?subject=Mock%20day%20support%20-%20${sessionCode}`;
    },
  };

  return (
    <div className="space-y-4">
      {showCheckIn && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-white">
              <Zap size={18} />
            </div>
            <div>
              <p className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
                {checkIn.title}
              </p>
              <p className="mt-0.5 text-gray-600" style={{ fontSize: "12px" }}>
                {checkIn.description}
              </p>
            </div>
          </div>
          <Link
            href={`/exam/${sessionCode}/check-in`}
            className="mt-4 block w-full rounded-xl bg-[#1B2A4A] py-2.5 text-center font-semibold text-white hover:bg-[#243660]"
            style={{ fontSize: "13px" }}
          >
            {checkIn.actionLabel} &gt;
          </Link>
          {canReschedule && (
            <button
              type="button"
              onClick={() => setRescheduleOpen(true)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white py-2.5 font-semibold text-amber-700 hover:bg-amber-100"
              style={{ fontSize: "13px" }}
            >
              <CalendarClock size={14} />
              Reschedule mock
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Headphones size={16} className="text-gray-500" />
          <h3 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
            Technical Support
          </h3>
        </div>
        {[
          {
            icon: MessageCircle,
            label: "Live Chat",
            sub: "Avg response < 2 min",
            action: "Open Chat",
          },
          {
            icon: Phone,
            label: "Call Support",
            sub: "+1 800 IELTS 01",
            action: "Call",
          },
          {
            icon: Mail,
            label: "Email Proctor",
            sub: "support@itestu.uz",
            action: "Email",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="mb-2 flex items-center justify-between rounded-xl border border-gray-100 p-3 last:mb-0"
          >
            <div className="flex items-center gap-3">
              <item.icon size={16} className="text-gray-400" />
              <div>
                <p className="font-semibold text-gray-900" style={{ fontSize: "13px" }}>
                  {item.label}
                </p>
                <p className="text-gray-500" style={{ fontSize: "11px" }}>
                  {item.sub}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={supportActions[item.action]}
              className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
              style={{ fontSize: "12px" }}
            >
              {item.action}
              <ExternalLink size={12} />
            </button>
          </div>
        ))}
      </div>

      {hasSpeaking && (
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-white"
          style={{ background: navyGradient }}
        >
          <div className="absolute inset-0 opacity-[0.04]" style={dotTexture} />
          <div className="relative">
            <div className="mb-2 flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <span
                className="font-bold tracking-wider text-amber-400"
                style={{ fontSize: "10px" }}
              >
                SPEAKING TIP
              </span>
            </div>
            <p style={{ fontSize: "13px", lineHeight: 1.6 }}>{speakingTip}</p>
            <button
              type="button"
              onClick={() =>
                toast("Speaking tips", {
                  description: "More practice tips are on the way.",
                  variant: "info",
                })
              }
              className="mt-3 font-semibold text-blue-300 hover:text-white"
              style={{ fontSize: "12px" }}
            >
              More tips &gt;
            </button>
          </div>
        </div>
      )}

      {rescheduleOpen && (
        <RescheduleDialog
          enrollmentId={data.enrollmentId}
          currentDateIso={data.mockDateIso}
          currentTime={data.mockTime}
          hasSpeaking={hasSpeaking}
          onClose={() => setRescheduleOpen(false)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
