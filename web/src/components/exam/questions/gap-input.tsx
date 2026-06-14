"use client";

import { cn } from "@/lib/utils";

interface GapInputProps {
  n: number;
  value: string;
  placeholder?: string;
  active: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
}

/** Inline numbered blank used in note/form/table/summary completion. */
export function GapInput({
  n,
  value,
  placeholder,
  active,
  onChange,
  onFocus,
}: GapInputProps) {
  return (
    <span className="mx-1 inline-flex items-center align-baseline">
      <span
        className={cn(
          "mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-bold",
          value.trim()
            ? "bg-emerald-100 text-emerald-700"
            : "bg-navy text-white",
        )}
      >
        {n}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          "min-w-[7rem] rounded-md border-b-2 bg-transparent px-2 py-0.5 text-[15px] font-medium text-navy outline-none transition",
          active
            ? "border-navy bg-sky-50"
            : value.trim()
              ? "border-emerald-400"
              : "border-slate-300 hover:border-slate-400",
        )}
      />
    </span>
  );
}
