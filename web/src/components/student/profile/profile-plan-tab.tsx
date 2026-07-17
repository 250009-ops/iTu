"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentProfileData } from "@/contexts/student-profile-context";
import { useToast } from "@/components/ui/toast";
import { planStudyTips, planWhySetGoal } from "@/lib/student/plan-preview";

const TARGET_BANDS = ["6", "6.5", "7", "7.5", "8", "8.5", "9"];

type ProfilePlanTabProps = {
  portal?: "marketplace" | "institution";
};

export function ProfilePlanTab({ portal = "marketplace" }: ProfilePlanTabProps) {
  const { profile, update } = useStudentProfileData();
  const { toast } = useToast();
  const [targetBand, setTargetBand] = useState("");
  const [examType, setExamType] = useState<"academic" | "general_training">(
    "academic",
  );
  const [saving, setSaving] = useState(false);
  const isInstitution = portal === "institution";

  useEffect(() => {
    if (!profile) return;
    setTargetBand(
      profile.targetBand != null ? String(profile.targetBand) : "",
    );
    setExamType(profile.examType);
  }, [profile]);

  if (!profile) return null;

  const hasGoal = profile.targetBand != null;
  const mocksTaken = profile.scoreHistory.length;
  const bestBand = profile.heroStats[0]?.value;
  const hasBestBand = bestBand != null && bestBand !== "—";
  const resultsHref = isInstitution ? "/inst-student/results" : "/student/results";

  async function saveGoal() {
    if (!targetBand) {
      toast("Select a target band", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      await update({
        targetBand: Number(targetBand),
        examType,
      });
      toast("IELTS plan saved", {
        description: `Target Band ${targetBand} · ${examType === "general_training" ? "General Training" : "Academic"}`,
        variant: "success",
      });
    } catch {
      toast("Could not save your plan", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  function GoalForm({ compact = false }: { compact?: boolean }) {
    return (
      <div
        className={
          compact
            ? "space-y-4 p-6 sm:p-8"
            : "grid gap-6 p-6 sm:p-8 lg:grid-cols-2"
        }
      >
        <div className="space-y-4">
          <div>
            <label
              className="mb-1.5 block font-semibold text-gray-700"
              style={{ fontSize: "13px" }}
            >
              Target band score
            </label>
            <select
              value={targetBand}
              onChange={(e) => setTargetBand(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900 outline-none focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
            >
              <option value="">Select your goal band</option>
              {TARGET_BANDS.map((band) => (
                <option key={band} value={band}>
                  Band {band}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="mb-1.5 block font-semibold text-gray-700"
              style={{ fontSize: "13px" }}
            >
              Exam type
            </label>
            <select
              value={examType}
              onChange={(e) =>
                setExamType(e.target.value as "academic" | "general_training")
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900 outline-none focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
            >
              <option value="academic">Academic</option>
              <option value="general_training">General Training</option>
            </select>
          </div>
          <Button
            variant="danger"
            size="lg"
            className="w-full sm:w-auto"
            disabled={saving}
            onClick={() => void saveGoal()}
          >
            {saving ? "Saving…" : hasGoal ? "Update IELTS goal" : "Save my IELTS plan"}
          </Button>
        </div>

        {!compact && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-5">
            <p
              className="font-semibold text-gray-900"
              style={{ fontSize: "14px" }}
            >
              Why set a target?
            </p>
            <ul className="mt-3 space-y-2.5">
              {planWhySetGoal.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-gray-600"
                  style={{ fontSize: "13px" }}
                >
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (!hasGoal || isInstitution) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div
            className="px-6 py-8 text-white sm:px-8"
            style={{
              background:
                "linear-gradient(135deg, #0a1628 0%, #1B2A4A 55%, #1e3a70 100%)",
            }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-200">
              <Target size={14} />
              {hasGoal ? "Your IELTS goal" : "No goal set yet"}
            </span>
            <h2
              className="mt-4 font-black tracking-tight"
              style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
            >
              {hasGoal ? "Update your target band" : "Set your IELTS target band"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-200/90">
              {isInstitution
                ? "Your centre uses this goal to track your progress on assigned mocks."
                : "Tell us your goal band and exam type so we can personalise your dashboard, results insights, and study recommendations."}
            </p>
          </div>

          <GoalForm compact={isInstitution && hasGoal} />
        </div>

        {hasGoal && isInstitution && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Best band so far
              </p>
              <p
                className="mt-2 font-black text-navy"
                style={{ fontSize: "28px", lineHeight: 1 }}
              >
                {hasBestBand ? bestBand : "—"}
              </p>
              <p className="mt-1 text-gray-500" style={{ fontSize: "12px" }}>
                {mocksTaken > 0 ? "From completed mocks" : "No mocks yet"}
              </p>
            </div>
          </div>
        )}

        {!isInstitution && !hasGoal && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-gray-900" style={{ fontSize: "15px" }}>
              Ready to start measuring progress?
            </p>
            <p className="mt-2 text-gray-500" style={{ fontSize: "13px" }}>
              Book a full mock to establish your baseline before your first real
              IELTS attempt.
            </p>
            <Link href="/student/browse" className="mt-4 inline-block">
              <Button variant="secondary" size="sm">
                Browse mock packages
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  const examLabel =
    profile.examType === "general_training"
      ? "General Training"
      : "Academic";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Target band
          </p>
          <p
            className="mt-2 font-black text-navy"
            style={{ fontSize: "28px", lineHeight: 1 }}
          >
            {profile.targetBand!.toFixed(1)}
          </p>
          <p className="mt-1 text-gray-500" style={{ fontSize: "12px" }}>
            Your next goal
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Exam type
          </p>
          <p
            className="mt-2 font-bold text-navy"
            style={{ fontSize: "18px" }}
          >
            {examLabel}
          </p>
          <p className="mt-1 text-gray-500" style={{ fontSize: "12px" }}>
            IELTS format
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Best band so far
          </p>
          <p
            className="mt-2 font-black text-navy"
            style={{ fontSize: "28px", lineHeight: 1 }}
          >
            {hasBestBand ? bestBand : "—"}
          </p>
          <p className="mt-1 text-gray-500" style={{ fontSize: "12px" }}>
            {mocksTaken > 0 ? "From completed mocks" : "No mocks yet"}
          </p>
        </div>
      </div>

      {hasBestBand &&
        profile.targetBand != null &&
        Number(bestBand) < profile.targetBand && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5 shadow-sm">
            <p className="font-semibold text-navy" style={{ fontSize: "14px" }}>
              {(profile.targetBand - Number(bestBand)).toFixed(1)} bands to your
              target
            </p>
            <p className="mt-1 text-gray-600" style={{ fontSize: "13px" }}>
              Focus on your weakest module after reviewing your latest results.
            </p>
            <Link
              href={resultsHref}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-800"
            >
              View results breakdown
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
          Study recommendations
        </h3>
        <p className="mt-0.5 text-gray-500" style={{ fontSize: "13px" }}>
          Practical steps toward Band {profile.targetBand!.toFixed(1)}
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {planStudyTips.map((tip) => (
            <div
              key={tip.title}
              className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
            >
              <p className="font-semibold text-navy" style={{ fontSize: "14px" }}>
                {tip.title}
              </p>
              <p className="mt-1 text-gray-500" style={{ fontSize: "12px" }}>
                {tip.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/student/browse">
          <Button variant="danger" size="sm">
            Book a mock
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <Link
          href="/student/profile?tab=overview"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Update goal in Overview
        </Link>
      </div>
    </div>
  );
}
