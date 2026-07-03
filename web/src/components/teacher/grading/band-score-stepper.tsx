"use client";

import { Minus, Plus } from "lucide-react";
import { ieltsBandOptions } from "@/lib/speaking/scoring";
import { cn } from "@/lib/utils";

function clampBand(value: number): number {
  const idx = ieltsBandOptions.indexOf(value);
  if (idx >= 0) return value;
  const nearest = ieltsBandOptions.reduce((best, band) =>
    Math.abs(band - value) < Math.abs(best - value) ? band : best,
  );
  return nearest;
}

function stepBand(value: number, delta: number): number {
  const idx = ieltsBandOptions.indexOf(clampBand(value));
  const next = Math.min(
    ieltsBandOptions.length - 1,
    Math.max(0, idx + delta),
  );
  return ieltsBandOptions[next] ?? value;
}

export function BandScoreStepper({
  value,
  onChange,
  className,
  selectClassName,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  selectClassName?: string;
}) {
  const band = clampBand(value);
  const atMin = band <= 0;
  const atMax = band >= 9;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <button
        type="button"
        aria-label="Decrease band by 0.5"
        disabled={atMin}
        onClick={() => onChange(stepBand(band, -1))}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <select
        aria-label="Band score"
        value={band}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "h-8 w-[3.25rem] shrink-0 cursor-pointer rounded-lg border border-border bg-white text-center text-sm font-bold tabular-nums text-navy focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100",
          selectClassName,
        )}
      >
        {ieltsBandOptions.map((score) => (
          <option key={score} value={score}>
            {Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1)}
          </option>
        ))}
      </select>

      <button
        type="button"
        aria-label="Increase band by 0.5"
        disabled={atMax}
        onClick={() => onChange(stepBand(band, 1))}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
