"use client";

import { Highlighter, MessageSquareQuote } from "lucide-react";
import type { PendingSelection } from "@/lib/exam/reading-marks";

type Props = {
  selection: PendingSelection;
  onHighlight: () => void;
  onNote: () => void;
  onDismiss: () => void;
};

export function PassageSelectionToolbar({
  selection,
  onHighlight,
  onNote,
  onDismiss,
}: Props) {
  const top = selection.rect.bottom + 6;
  const left = selection.rect.left + selection.rect.width / 2;

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss selection menu"
        className="fixed inset-0 z-40"
        onMouseDown={(e) => {
          e.preventDefault();
          onDismiss();
        }}
      />
      <div
        className="fixed z-50 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-4 py-2.5 shadow-lg"
        style={{ top, left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div
          className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-slate-200 bg-white"
          aria-hidden
        />
        <div className="flex items-start gap-6">
          <button
            type="button"
            onClick={onNote}
            className="flex flex-col items-center gap-1 text-[11px] text-slate-700 transition hover:text-black"
          >
            <MessageSquareQuote size={22} strokeWidth={1.5} />
            Note
          </button>
          <button
            type="button"
            onClick={onHighlight}
            className="flex flex-col items-center gap-1 text-[11px] text-slate-700 transition hover:text-black"
          >
            <Highlighter size={22} strokeWidth={1.5} />
            Highlight
          </button>
        </div>
      </div>
    </>
  );
}
