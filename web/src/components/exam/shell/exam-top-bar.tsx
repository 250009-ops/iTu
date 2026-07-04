"use client";

import { useState } from "react";
import { HelpCircle, Menu, NotebookPen, Settings, Volume2, Wifi, X } from "lucide-react";
import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { ContrastMenu } from "@/components/exam/shell/contrast-menu";
import type { ContrastMode } from "@/lib/exam/contrast";
import { cn } from "@/lib/utils";

export type ExamDisplayTools = {
  contrast: ContrastMode;
  onContrast: (mode: ContrastMode) => void;
  notes?: {
    open: boolean;
    onToggle: () => void;
    count: number;
  };
};

interface ExamTopBarProps {
  testTakerId: string;
  /** Right-aligned timer element. */
  timer?: React.ReactNode;
  /** Listening audio status banner — only shown when provided. */
  audioStatus?: string;
  /** Settings popover toggles. */
  textSize: "normal" | "large" | "xlarge";
  onTextSize: (size: "normal" | "large" | "xlarge") => void;
  hideTimer: boolean;
  onToggleTimer: (hidden: boolean) => void;
  /** Contrast menu (+ optional reading notes). */
  displayTools?: ExamDisplayTools;
}

export function ExamTopBar({
  testTakerId,
  timer,
  audioStatus,
  textSize,
  onTextSize,
  hideTimer,
  onToggleTimer,
  displayTools,
}: ExamTopBarProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contrastOpen, setContrastOpen] = useState(false);

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-700 bg-[#1b2a4a] px-4 text-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BrandMarkIcon size="md" />
          <span className="text-sm font-semibold tracking-tight">itestu</span>
        </div>
        <div className="hidden h-6 w-px bg-slate-600 sm:block" />
        <span className="hidden text-[13px] text-slate-300 sm:block">
          Test taker ID:{" "}
          <span className="font-semibold text-white">{testTakerId}</span>
        </span>
      </div>

      {audioStatus && (
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 md:flex">
          <Volume2 size={15} className="text-emerald-300" />
          <span className="text-[13px] font-medium text-emerald-200">
            {audioStatus}
          </span>
          <span className="flex items-end gap-0.5">
            {[3, 6, 4, 7, 5].map((h, i) => (
              <span
                key={i}
                className="w-0.5 animate-pulse rounded-full bg-emerald-300"
                style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {timer}
        <span className="mx-1 hidden items-center gap-1 text-slate-400 sm:flex">
          <Wifi size={17} />
        </span>

        {displayTools && (
          <>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setContrastOpen((o) => !o);
                  setSettingsOpen(false);
                }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white",
                  contrastOpen && "bg-white/10 text-white",
                )}
                aria-label="Contrast settings"
              >
                <Menu size={18} />
              </button>
              {contrastOpen && (
                <ContrastMenu
                  contrast={displayTools.contrast}
                  onContrast={displayTools.onContrast}
                  onClose={() => setContrastOpen(false)}
                />
              )}
            </div>

            {displayTools.notes && (
              <button
                type="button"
                onClick={() => {
                  displayTools.notes!.onToggle();
                  setSettingsOpen(false);
                  setContrastOpen(false);
                }}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white",
                  displayTools.notes.open && "bg-white/10 text-white",
                )}
                aria-label="Notes"
              >
                <NotebookPen size={18} />
                {displayTools.notes.count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
                    {displayTools.notes.count}
                  </span>
                )}
              </button>
            )}
          </>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setSettingsOpen((o) => !o);
              setHelpOpen(false);
            }}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white",
              settingsOpen && "bg-white/10 text-white",
            )}
            aria-label="Display settings"
          >
            <Settings size={18} />
          </button>
          {settingsOpen && (
            <SettingsPopover
              textSize={textSize}
              onTextSize={onTextSize}
              hideTimer={hideTimer}
              onToggleTimer={onToggleTimer}
              onClose={() => setSettingsOpen(false)}
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setHelpOpen(true);
            setSettingsOpen(false);
            setContrastOpen(false);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Help"
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </header>
  );
}

function SettingsPopover({
  textSize,
  onTextSize,
  hideTimer,
  onToggleTimer,
  onClose,
}: {
  textSize: "normal" | "large" | "xlarge";
  onTextSize: (s: "normal" | "large" | "xlarge") => void;
  hideTimer: boolean;
  onToggleTimer: (h: boolean) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[45]" onClick={onClose} />
      <div className="absolute right-0 top-11 z-[60] w-64 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Text size
        </p>
        <div className="mb-4 grid grid-cols-3 gap-1.5">
          {(["normal", "large", "xlarge"] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onTextSize(size)}
              className={cn(
                "rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition",
                textSize === size
                  ? "border-navy bg-navy text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              {size === "xlarge" ? "X-Large" : size}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
          <span className="font-medium text-slate-700">Hide timer</span>
          <input
            type="checkbox"
            checked={hideTimer}
            onChange={(e) => onToggleTimer(e.target.checked)}
            className="h-4 w-4 accent-[#1b2a4a]"
          />
        </label>
      </div>
    </>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-slate-800 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Test help</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="space-y-2.5 text-sm text-slate-600">
          <li>• Use the navigation bar at the bottom to move between questions.</li>
          <li>• A green marker above a number means you have answered it.</li>
          <li>• The blue box shows the question you are currently viewing.</li>
          <li>• You cannot pause the test or rewind the audio.</li>
          <li>• Your answers are saved automatically.</li>
          <li>• For technical problems, raise your hand for an invigilator.</li>
        </ul>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
