"use client";

import { useState } from "react";
import { PenLine, Mic, TrendingUp } from "lucide-react";

const WRITING_RATE = 20;
const SPEAKING_RATE = 20;

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
        <p className="mt-2 text-5xl font-extrabold">${monthly.toLocaleString()}</p>
        <p className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400">
          <TrendingUp className="h-4 w-4" /> Weekly payout ~${weekly.toLocaleString()}
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
          rateLabel={`$${WRITING_RATE} per task × ${writing}`}
          totalClass="bg-violet-50 text-violet-700"
        />
        <Slider
          icon={<Mic className="h-4 w-4 text-rose-600" />}
          label="Speaking sessions / month"
          value={speaking}
          onChange={setSpeaking}
          accent="accent-rose-500"
          total={speakingTotal}
          rateLabel={`$${SPEAKING_RATE} per session × ${speaking}`}
          totalClass="bg-rose-50 text-rose-700"
        />
      </div>

      <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-muted">
        Rates shown are example estimates. Actual rates may vary based on exam type and session
        length. Full rate card provided after onboarding.
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
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          {icon} {label}
        </span>
        <span className="text-lg font-bold text-navy">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={80}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-3 w-full ${accent}`}
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>0</span>
        <span>80</span>
      </div>
      <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${totalClass}`}>
        <span className="font-normal opacity-80">{rateLabel}</span>
        <span>${total.toLocaleString()}</span>
      </div>
    </div>
  );
}
