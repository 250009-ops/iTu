"use client";

import { Check } from "lucide-react";
import type { ContrastMode } from "@/lib/exam/contrast";
import { CONTRAST_OPTIONS } from "@/lib/exam/contrast";
import { cn } from "@/lib/utils";

type Props = {
  contrast: ContrastMode;
  onContrast: (mode: ContrastMode) => void;
  onClose: () => void;
};

function PreviewIcon({ bg, fg }: { bg: string; fg: string }) {
  return (
    <span
      className="inline-flex h-7 w-10 flex-col justify-center gap-0.5 rounded-sm border border-slate-300 p-1 shadow-sm"
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      {[0.85, 1, 0.7, 0.9].map((w, i) => (
        <span
          key={i}
          className="h-0.5 rounded-full"
          style={{ backgroundColor: fg, width: `${w * 100}%` }}
        />
      ))}
    </span>
  );
}

export function ContrastMenu({ contrast, onContrast, onClose }: Props) {
  return (
    <>
      <button
        type="button"
        aria-label="Close contrast menu"
        className="fixed inset-0 z-[45]"
        onClick={onClose}
      />
      <div className="absolute right-0 top-11 z-[60] w-72 rounded-lg border border-slate-200 bg-white p-4 text-black shadow-xl">
        <p className="mb-3 text-center text-[15px] font-normal">Contrast</p>
        <div className="overflow-hidden rounded-md border border-slate-200">
          {CONTRAST_OPTIONS.map((opt, index) => {
            const selected = contrast === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onContrast(opt.id);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left text-[14px] transition hover:bg-slate-100",
                  index > 0 && "border-t border-slate-200",
                )}
              >
                <span className="flex w-5 shrink-0 justify-center">
                  {selected && <Check size={16} strokeWidth={2.5} />}
                </span>
                <span className="flex-1">{opt.label}</span>
                <PreviewIcon bg={opt.previewBg} fg={opt.previewFg} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
