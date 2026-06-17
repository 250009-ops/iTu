"use client";

import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  active?: boolean;
  className?: string;
  "aria-label"?: string;
};

/** Cambridge-style section/feature dropdown used across reading question types. */
export function ExamSelect({
  value,
  onChange,
  onFocus,
  options,
  placeholder = "Select",
  active,
  className,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <select
      value={value}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 min-w-[7.5rem] shrink-0 cursor-pointer appearance-none rounded-md border bg-white px-2.5 pr-8 text-[14px] shadow-sm transition",
        "bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat",
        value
          ? "border-slate-400 font-medium text-navy"
          : "border-slate-300 text-slate-500",
        active && "ring-2 ring-navy/20",
        className,
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      }}
      aria-label={ariaLabel}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
