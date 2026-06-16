"use client";

import { useEffect, useState } from "react";
import { submitWriting } from "@/lib/api/exam";

/** Debounced autosave for writing tasks via the submit-writing API. */
export function useWritingAutosave(
  sessionCode: string,
  task1Text: string,
  task2Text: string,
  debounceMs = 1500,
) {
  const [status, setStatus] = useState<"saved" | "saving" | "idle">("idle");

  useEffect(() => {
    if (!task1Text && !task2Text) return;

    setStatus("saving");
    const id = window.setTimeout(() => {
      void submitWriting(sessionCode, task1Text, task2Text).then(() =>
        setStatus("saved"),
      );
    }, debounceMs);

    return () => window.clearTimeout(id);
  }, [sessionCode, task1Text, task2Text, debounceMs]);

  return status;
}
