"use client";

import { useEffect, useState } from "react";
import { submitWriting } from "@/lib/api/exam";
import { flushExamSaveOutbox, queueWritingSave } from "@/lib/exam/save-outbox";

/** Debounced autosave for writing tasks via the submit-writing API. */
export function useWritingAutosave(
  sessionCode: string,
  task1Text: string,
  task2Text: string,
  debounceMs = 1500,
) {
  const [status, setStatus] = useState<"saved" | "saving" | "idle">("idle");

  useEffect(() => {
    function onOnline() {
      void flushExamSaveOutbox(sessionCode);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sessionCode]);

  useEffect(() => {
    if (!task1Text && !task2Text) return;

    setStatus("saving");
    const id = window.setTimeout(() => {
      void submitWriting(sessionCode, task1Text, task2Text)
        .then(() => setStatus("saved"))
        .catch(() => {
          void queueWritingSave(sessionCode, task1Text, task2Text);
          setStatus("idle");
        });
    }, debounceMs);

    return () => window.clearTimeout(id);
  }, [sessionCode, task1Text, task2Text, debounceMs]);

  return status;
}
