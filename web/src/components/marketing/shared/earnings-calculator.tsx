"use client";

import { useState } from "react";
import { PenLine, Mic, TrendingUp } from "lucide-react";
import { formatPrice } from "@/lib/format-price";

/** Example examiner rates in UZS so'm (marketing estimate only). */
const WRITING_RATE = 20_000;
const SPEAKING_RATE = 20_000;

export function EarningsCalculator() {
  const [writing, setWriting] = useState(20);
  const [speaking, setSpeaking] = useState(10);

  const writingTotal = writing * WRITING_RATE;
  const speakingTotal = speaking * SPEAKING_RATE;
  const monthly = writingTotal + speakingTotal;
  const weekly = Math.round(monthly / 4);

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <div className="rounded-2xl bg-navy p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Estimated monthly earnings
        </p>
        <p className="mt-2 text-4xl font-extrabold sm:text-5xl">
          {formatPrice(monthly)}
        </p>
        <p className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400">
          <TrendingUp className="h-4 w-4" /> Weekly payout ~{formatPrice(weekly)}
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Slider
          icon={<PenLine className="h-4 w-4 text-violet-600" />}
          label="Writing tasks / month"
          value={writing}
          onChange={setWriting}
          accent="accent-violet-500"
          total={writingTotal}
          rateLabel={`${formatPrice(WRITING_RATE)} per task × ${writing}`}
          totalClass="bg-violet-50 text-violet-700"
        />
        <Slider
          icon={<Mic className="h-4 w-4 text-rose-600" />}
          label="Speaking sessions / month"
          value={speaking}
          onChange={setSpeaking}
          accent="accent-rose-500"
          total={speakingTotal}
          rateLabel={`${formatPrice(SPEAKING_RATE)} per session × ${speaking}`}
          totalClass="bg-rose-50 text-rose-700"
        />
      </div>

      <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-muted">
        Rates shown are example estimates in Uzbek so&apos;m. Actual rates may vary based on
        exam type and session length. Full rate card provided after onboarding.
      </p>
    </div>
  );
}

function Slider({
  icon,
  label,
  value,
  onChange,
  accent,
  total,
  rateLabel,
  totalClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
  total: number;
  rateLabel: string;
  totalClass: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-navy">
          {icon}
          {label}
        </span>
        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${totalClass}`}>
          {formatPrice(total)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={40}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accent}`}
      />
      <p className="mt-1.5 text-xs text-muted">{rateLabel}</p>
    </div>
  );
}
