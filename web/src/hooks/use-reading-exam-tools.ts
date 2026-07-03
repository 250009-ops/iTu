"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContrastMode } from "@/lib/exam/contrast";
import { contrastStorageKey } from "@/lib/exam/contrast";
import type { ReadingMark } from "@/lib/exam/reading-marks";
import { marksStorageKey, newMarkId } from "@/lib/exam/reading-marks";

export function useReadingExamTools(sessionId: string) {
  const [marks, setMarks] = useState<ReadingMark[]>([]);
  const [contrast, setContrast] = useState<ContrastMode>("black-on-white");
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedMarks = sessionStorage.getItem(marksStorageKey(sessionId));
      if (savedMarks) setMarks(JSON.parse(savedMarks) as ReadingMark[]);
      const savedContrast = sessionStorage.getItem(contrastStorageKey(sessionId));
      if (
        savedContrast === "black-on-white" ||
        savedContrast === "white-on-black" ||
        savedContrast === "yellow-on-black"
      ) {
        setContrast(savedContrast);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, [sessionId]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(marksStorageKey(sessionId), JSON.stringify(marks));
  }, [marks, sessionId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(contrastStorageKey(sessionId), contrast);
  }, [contrast, sessionId, hydrated]);

  const addHighlight = useCallback(
    (input: Omit<ReadingMark, "id" | "kind" | "noteText" | "createdAt">) => {
      const mark: ReadingMark = {
        ...input,
        id: newMarkId(),
        kind: "highlight",
        noteText: "",
        createdAt: Date.now(),
      };
      setMarks((prev) => [...prev, mark]);
      window.getSelection()?.removeAllRanges();
      return mark.id;
    },
    [],
  );

  const addNote = useCallback(
    (input: Omit<ReadingMark, "id" | "kind" | "noteText" | "createdAt">) => {
      const mark: ReadingMark = {
        ...input,
        id: newMarkId(),
        kind: "note",
        noteText: "",
        createdAt: Date.now(),
      };
      setMarks((prev) => [...prev, mark]);
      setActiveNoteId(mark.id);
      setNotesOpen(true);
      window.getSelection()?.removeAllRanges();
      return mark.id;
    },
    [],
  );

  const updateNoteText = useCallback((id: string, noteText: string) => {
    setMarks((prev) =>
      prev.map((m) => (m.id === id ? { ...m, noteText } : m)),
    );
  }, []);

  const deleteMark = useCallback((id: string) => {
    setMarks((prev) => prev.filter((m) => m.id !== id));
    setActiveNoteId((prev) => (prev === id ? null : prev));
  }, []);

  const openNote = useCallback((id: string) => {
    setActiveNoteId(id);
    setNotesOpen(true);
  }, []);

  const toggleNotes = useCallback(() => {
    setNotesOpen((open) => {
      if (open) {
        setActiveNoteId(null);
        return false;
      }
      const firstNote = marks.find((m) => m.kind === "note");
      setActiveNoteId(firstNote?.id ?? null);
      return true;
    });
  }, [marks]);

  return {
    marks,
    contrast,
    setContrast,
    notesOpen,
    setNotesOpen,
    activeNoteId,
    setActiveNoteId,
    addHighlight,
    addNote,
    updateNoteText,
    deleteMark,
    openNote,
    toggleNotes,
  };
}
