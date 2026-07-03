"use client";

import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 200;

/** Controlled essay field with undo/redo (Ctrl+Z / Ctrl+Y) for exam writing. */
export function useEssayEditor(initial = "") {
  const [text, setText] = useState(initial);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const committed = useRef(initial);

  const apply = useCallback((next: string) => {
    setText(next);
    committed.current = next;
  }, []);

  const onChange = useCallback((next: string) => {
    if (next === committed.current) return;
    undoStack.current.push(committed.current);
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    apply(next);
  }, [apply]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev === undefined) return false;
    redoStack.current.push(committed.current);
    apply(prev);
    return true;
  }, [apply]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next === undefined) return false;
    undoStack.current.push(committed.current);
    apply(next);
    return true;
  }, [apply]);

  const reset = useCallback((value: string) => {
    undoStack.current = [];
    redoStack.current = [];
    apply(value);
  }, [apply]);

  /** Returns new text after replacing [start, end) with insertion (no commit). */
  const replaceRange = useCallback(
    (start: number, end: number, insertion: string) =>
      committed.current.slice(0, start) +
      insertion +
      committed.current.slice(end),
    [],
  );

  return { text, onChange, undo, redo, reset, replaceRange };
}

export function handleEssayEditorKeyDown(
  e: React.KeyboardEvent,
  undo: () => boolean,
  redo: () => boolean,
) {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;

  if (e.key.toLowerCase() === "z" && !e.shiftKey) {
    if (undo()) e.preventDefault();
    return;
  }
  if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
    if (redo()) e.preventDefault();
  }
  // Ctrl+X (cut) and Ctrl+A etc. remain native browser behaviour.
}
