"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Maximize,
  Mic,
  ScrollText,
} from "lucide-react";
import { ExamInterstitialHeader } from "@/components/exam/flow/exam-interstitial-header";
import { useExamSessionContext } from "@/contexts/exam-session-context";
import { useAuth, getInitials } from "@/hooks/use-auth";
import { checkInDestination, packageExamSkills } from "@/lib/exam/package-skills";
import { requestExamFullscreen } from "@/hooks/use-exam-integrity";
import { cn } from "@/lib/utils";

const FULL_MOCK_RULES = [
  "All sections must be completed today in order: Listening → Reading → Writing → Speaking.",
  "Timers are controlled by the server. You cannot pause or rewind.",
  "Audio in Listening plays once only.",
  "Copy and paste are disabled in all answer fields.",
  "Leaving the test window is logged and may be flagged.",
  "Your band scores are released only after Speaking is graded.",
];

const SPEAKING_ONLY_RULES = [
  "Complete your live Speaking session with your assigned examiner.",
  "Join on time — late arrival may shorten your session.",
  "Your microphone and webcam must work throughout the session.",
  "Speaking is recorded for examiner reference and quality assurance.",
  "Your speaking score is released within 24 hours.",
];

export function CheckInView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { session, performCheckIn } = useExamSessionContext();
  const { session: authSession } = useAuth();
  const [identity, setIdentity] = useState(false);
  const [rulesAck, setRulesAck] = useState(false);
  const [devices, setDevices] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const allDone = identity && rulesAck && devices;
  const studentName = authSession?.name ?? "Student";
  const initials = getInitials(studentName);
  const mockDate = session?.enrollment.mockDate
    ? new Date(session.enrollment.mockDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const packageSkills = packageExamSkills(session?.enrollment.package.skills);
  const isSpeakingOnly =
    packageSkills.length === 1 && packageSkills[0] === "speaking";
  const firstSection = checkInDestination(session?.enrollment.package.skills);
  const packageTitle = session?.enrollment.package.title ?? "Mock exam";
  const examRules = isSpeakingOnly ? SPEAKING_ONLY_RULES : FULL_MOCK_RULES;

  async function handleBegin() {
    setCheckingIn(true);
    // Enter fullscreen from the user gesture (browsers block this in effects).
    requestExamFullscreen();
    try {
      await performCheckIn();
      router.push(`/exam/${sessionId}/${firstSection}`);
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <>
      <ExamInterstitialHeader sessionId={sessionId} label="Check-in" />
      <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-navy">Exam day check-in</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isSpeakingOnly
                ? "Complete all three steps to unlock your Speaking session."
                : "Complete all three steps to unlock your first section."}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <CheckCard
              index={1}
              title="Identity verification"
              icon={<BadgeCheck size={18} />}
              done={identity}
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-base font-bold text-white">
                  {initials}
                </div>
                <div className="text-[13px] text-slate-600">
                  <p className="font-semibold text-slate-900">{studentName}</p>
                  <p>Candidate no. {sessionId}</p>
                  {mockDate && <p>{packageTitle} · {mockDate}</p>}
                </div>
              </div>
              <ConfirmButton
                done={identity}
                onClick={() => setIdentity(true)}
                label="Confirm my identity"
              />
            </CheckCard>

            <CheckCard
              index={2}
              title="Exam rules acknowledgment"
              icon={<ScrollText size={18} />}
              done={rulesAck}
            >
              <ul className="space-y-2">
                {examRules.map((r) => (
                  <li
                    key={r}
                    className="flex gap-2 text-[13px] text-slate-600"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                    {r}
                  </li>
                ))}
              </ul>
              <ConfirmButton
                done={rulesAck}
                onClick={() => setRulesAck(true)}
                label="I have read and accept the rules"
              />
            </CheckCard>

            <CheckCard
              index={3}
              title="Device check"
              icon={<Headphones size={18} />}
              done={devices}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: <Headphones size={16} />, label: "Headphones" },
                  { icon: <Mic size={16} />, label: "Microphone" },
                  { icon: <Camera size={16} />, label: "Webcam" },
                ].map((d) => (
                  <div
                    key={d.label}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px]"
                  >
                    <span className="text-slate-400">{d.icon}</span>
                    <span className="flex-1 font-medium text-slate-700">
                      {d.label}
                    </span>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                ))}
              </div>
              <ConfirmButton
                done={devices}
                onClick={() => setDevices(true)}
                label="Devices working correctly"
              />
            </CheckCard>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <button
              type="button"
              disabled={!allDone || checkingIn}
              onClick={() => void handleBegin()}
              className="flex items-center gap-2 rounded-xl bg-brand-red px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Maximize size={16} />
              {checkingIn
                ? "Checking in…"
                : isSpeakingOnly
                  ? "Begin Speaking session"
                  : "Begin first section"}
              <ChevronRight size={16} />
            </button>
            <p className="mt-2 text-[12px] text-slate-400">
              {isSpeakingOnly
                ? "You will join your live Speaking room after check-in."
                : "The test will open in full screen. Your section timer starts immediately."}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

function CheckCard({
  index,
  title,
  icon,
  done,
  children,
}: {
  index: number;
  title: string;
  icon: React.ReactNode;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-5 transition",
        done ? "border-emerald-200" : "border-slate-200",
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            done ? "bg-emerald-100 text-emerald-600" : "bg-navy/5 text-navy",
          )}
        >
          {done ? <CheckCircle2 size={18} /> : icon}
        </span>
        <h2 className="text-[15px] font-bold text-slate-900">
          <span className="text-slate-400">Step {index} · </span>
          {title}
        </h2>
      </div>
      <div className="space-y-4 pl-12">{children}</div>
    </div>
  );
}

function ConfirmButton({
  done,
  onClick,
  label,
}: {
  done: boolean;
  onClick: () => void;
  label: string;
}) {
  if (done) {
    return (
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
        <CheckCircle2 size={15} /> Completed
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-navy px-4 py-2 text-[13px] font-semibold text-navy transition hover:bg-navy hover:text-white"
    >
      {label}
    </button>
  );
}
