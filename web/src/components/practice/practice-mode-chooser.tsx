"use client";

import { ChevronRight, Info, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  PRACTICE_MODE_META,
  type PracticeModeId,
} from "@/components/practice/practice-chrome";
import type { PracticeAttemptMode } from "@/lib/api/practice";
import { AI_FEATURES_ENABLED } from "@/lib/ai/feature-flags";
import { cn } from "@/lib/utils";

type ModeCard = {
  id: PracticeModeId;
  badge: string;
  badgeClassName: string;
  detail: string[];
};

const MODE_CARDS: ModeCard[] = [
  {
    id: "practice",
    badge: "Most popular",
    badgeClassName: "bg-rose-50 text-brand-red",
    detail: [
      "Full timed attempt",
      "All question types",
      ...(AI_FEATURES_ENABLED ? ["AI Review Coach after submit"] : ["Instant scored review"]),
    ],
  },
  {
    id: "skim",
    badge: "Reading strategy",
    badgeClassName: "bg-emerald-50 text-emerald-700",
    detail: [
      "One check per paragraph",
      "Questions unlock after the gate",
      "Builds global comprehension",
    ],
  },
  {
    id: "scan",
    badge: "Speed drill",
    badgeClassName: "bg-amber-50 text-amber-700",
    detail: [
      "Timed find-the-fact tasks",
      "Tap the correct paragraph",
      "Trains evidence location speed",
    ],
  },
  {
    id: "guided",
    badge: "Best for learning",
    badgeClassName: "bg-blue-50 text-blue-700",
    detail: [
      "Coach models first, then guides",
      "Hint ladder (3 levels)",
      "No time pressure",
    ],
  },
];

export function PracticeModeChooser({
  open,
  unitTitle,
  starting,
  onSelect,
  onClose,
}: {
  open: boolean;
  unitTitle: string;
  starting?: boolean;
  onSelect: (mode: PracticeAttemptMode) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Choose reading mode"
      className="max-w-[34rem] animate-practice-pop-in"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-navy">Choose reading mode</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{unitTitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-muted transition-colors hover:text-navy"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {MODE_CARDS.map((card) => {
          const meta = PRACTICE_MODE_META[card.id];
          const Icon = meta.icon;
          return (
            <button
              key={card.id}
              type="button"
              disabled={starting}
              onClick={() => onSelect(card.id)}
              className="group flex w-full items-start gap-3.5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-left transition-all hover:border-navy/40 hover:bg-white hover:shadow-sm disabled:opacity-60"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  meta.tile,
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-navy">
                    {meta.label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                      card.badgeClassName,
                    )}
                  >
                    {card.badge}
                  </span>
                </span>
                <span className="block text-[13px] text-slate-600">
                  {meta.tagline}
                </span>
                <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {card.detail.map((line) => (
                    <span
                      key={line}
                      className="flex items-center gap-1 text-[11px] text-slate-400"
                    >
                      <Info className="h-2.5 w-2.5 text-slate-300" />
                      {line}
                    </span>
                  ))}
                </span>
              </span>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy" />
            </button>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-center">
        <p className="text-[11.5px] text-slate-400">
          {starting
            ? "Starting your attempt…"
            : AI_FEATURES_ENABLED
              ? "All modes use 1 reading attempt · AI Review Coach included"
              : "All modes use 1 reading attempt"}
        </p>
      </div>
    </Modal>
  );
}
