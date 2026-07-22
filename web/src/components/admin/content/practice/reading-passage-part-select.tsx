"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ReadingPassagePart = 1 | 2 | 3;

export const READING_PASSAGE_PART_OPTIONS: {
  value: ReadingPassagePart;
  label: string;
}[] = [
  { value: 1, label: "Passage 1 (Q1–13)" },
  { value: 2, label: "Passage 2 (Q14–26)" },
  { value: 3, label: "Passage 3 (Q27–40)" },
];

type Props = {
  value: ReadingPassagePart;
  onChange: (part: ReadingPassagePart) => void;
  disabled?: boolean;
  inline?: boolean;
  className?: string;
};

export function ReadingPassagePartSelect({
  value,
  onChange,
  disabled,
  inline = false,
  className,
}: Props) {
  const control = (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value) as ReadingPassagePart)}
      className={cn(
        "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy",
        className,
      )}
    >
      {READING_PASSAGE_PART_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (inline) {
    return (
      <label className={cn("flex items-center gap-2 text-sm text-muted", className)}>
        <span className="font-medium text-navy">Passage</span>
        {control}
      </label>
    );
  }

  return (
    <div className={className}>
      <Label>IELTS passage</Label>
      {control}
      <p className="mt-1 text-xs text-muted">
        Sets question numbering for this practice unit (Q1–13, Q14–26, or Q27–40).
      </p>
    </div>
  );
}
