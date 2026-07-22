"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ReadingPassagePart = 1 | 2 | 3;

export const READING_PASSAGE_PART_OPTIONS: {
  value: ReadingPassagePart;
  label: string;
  shortLabel: string;
}[] = [
  { value: 1, label: "Passage 1 (Q1–13)", shortLabel: "Passage 1" },
  { value: 2, label: "Passage 2 (Q14–26)", shortLabel: "Passage 2" },
  { value: 3, label: "Passage 3 (Q27–40)", shortLabel: "Passage 3" },
];

export function readingPassagePracticeTitle(part: ReadingPassagePart): string {
  return `Reading Passage ${part} practice`;
}

type TabProps = {
  value: ReadingPassagePart;
  onChange: (part: ReadingPassagePart) => void;
  disabled?: boolean;
  className?: string;
};

export function ReadingPassagePartTabs({
  value,
  onChange,
  disabled,
  className,
}: TabProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {READING_PASSAGE_PART_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            value === option.value
              ? "bg-emerald-600 text-white"
              : "border border-slate-200 bg-white text-muted hover:bg-slate-50 hover:text-navy",
          )}
        >
          {option.shortLabel}
        </button>
      ))}
    </div>
  );
}

type SelectProps = TabProps & {
  inline?: boolean;
};

/** Used inside the unit editor while filling content. */
export function ReadingPassagePartSelect({
  value,
  onChange,
  disabled,
  inline = false,
  className,
}: SelectProps) {
  if (inline) {
    return (
      <ReadingPassagePartTabs
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <Label>IELTS passage</Label>
      <ReadingPassagePartTabs
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="mt-2"
      />
      <p className="mt-2 text-xs text-muted">
        Sets question numbering for this practice unit (Q1–13, Q14–26, or Q27–40).
      </p>
    </div>
  );
}
