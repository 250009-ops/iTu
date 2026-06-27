"use client";

import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-slate-50 p-0.5",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            value === option.value
              ? "bg-navy text-white shadow-sm"
              : "text-muted hover:text-navy",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
