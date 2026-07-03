"use client";

import { X } from "lucide-react";
import type { ContrastTheme } from "@/lib/exam/contrast";
import type { ReadingMark } from "@/lib/exam/reading-marks";
import { EXAM_FONT_STYLE } from "@/lib/exam/typography";

type Props = {
  open: boolean;
  marks: ReadingMark[];
  activeNoteId: string | null;
  theme: ContrastTheme;
  onClose: () => void;
  onSelectNote: (id: string) => void;
  onUpdateNote: (id: string, text: string) => void;
  onDelete: (id: string) => void;
};

export function ReadingNotesPanel({
  open,
  marks,
  activeNoteId,
  theme,
  onClose,
  onSelectNote,
  onUpdateNote,
  onDelete,
}: Props) {
  if (!open) return null;

  const notes = marks.filter((m) => m.kind === "note");
  const active =
    notes.find((n) => n.id === activeNoteId) ?? notes[notes.length - 1];

  return (
    <aside
      className="absolute inset-y-0 right-0 z-30 flex w-72 flex-col border-l shadow-xl sm:w-80"
      style={{
        ...EXAM_FONT_STYLE,
        backgroundColor: theme.panelBg,
        borderColor: theme.border,
        color: theme.fg,
      }}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-2.5"
        style={{ borderColor: theme.border, backgroundColor: theme.bar }}
      >
        <span className="text-[13px] font-bold">Notes</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notes"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-black/5"
        >
          <X size={16} />
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="px-4 py-6 text-[13px]" style={{ color: theme.muted }}>
          Select text in the passage and choose Note to add a note here.
        </p>
      ) : (
        <>
          {notes.length > 1 && (
            <div
              className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2"
              style={{ borderColor: theme.border }}
            >
              {notes.map((note, i) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onSelectNote(note.id)}
                  className="shrink-0 rounded px-2 py-1 text-[11px] font-semibold"
                  style={{
                    backgroundColor:
                      active?.id === note.id ? "#1e4a7a" : theme.bar,
                    color: active?.id === note.id ? "#ffffff" : theme.fg,
                  }}
                >
                  Note {i + 1}
                </button>
              ))}
            </div>
          )}

          {active && (
            <div className="flex min-h-0 flex-1 flex-col p-3">
              <div className="flex min-h-0 flex-1 flex-col rounded-sm bg-[#1e4a7a] p-3 text-white">
                <p className="mb-3 text-[12px] italic leading-snug">
                  &ldquo;{active.text}&rdquo;
                </p>
                <textarea
                  value={active.noteText}
                  onChange={(e) => onUpdateNote(active.id, e.target.value)}
                  placeholder="Start typing your note"
                  rows={5}
                  className="min-h-[100px] w-full flex-1 resize-none rounded-sm border-0 bg-white px-2.5 py-2 text-[13px] text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onDelete(active.id)}
                    className="text-[12px] text-white/90 underline hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
