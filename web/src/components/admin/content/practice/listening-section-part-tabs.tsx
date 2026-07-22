"use client";

import { cn } from "@/lib/utils";

export type ListeningSectionPart = 1 | 2 | 3 | 4;

export const LISTENING_SECTION_PART_OPTIONS: {
  value: ListeningSectionPart;
  label: string;
}[] = [
  { value: 1, label: "Section 1" },
  { value: 2, label: "Section 2" },
  { value: 3, label: "Section 3" },
  { value: 4, label: "Section 4" },
];

export function listeningSectionPracticeTitle(part: ListeningSectionPart): string {
  return `Listening Section ${part} practice`;
}

type Props = {
  value: ListeningSectionPart;
  onChange: (part: ListeningSectionPart) => void;
  disabled?: boolean;
  className?: string;
};

export function ListeningSectionPartTabs({
  value,
  onChange,
  disabled,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {LISTENING_SECTION_PART_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            value === option.value
              ? "bg-sky-600 text-white"
              : "border border-slate-200 bg-white text-muted hover:bg-slate-50 hover:text-navy",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
