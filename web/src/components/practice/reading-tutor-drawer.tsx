"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  askPracticeTutor,
  getPracticeTutorMessages,
} from "@/lib/api/practice";
import { cn } from "@/lib/utils";

type Props = {
  attemptId: string;
  questionN: number | null;
  open: boolean;
  onClose: () => void;
};

const CHIPS = [
  { id: "why-not", label: "Why is this wrong?" },
  { id: "ng-vs-false", label: "NG or False?" },
  { id: "paraphrase", label: "Show paraphrase" },
  { id: "scan-path", label: "Explain scan path" },
  { id: "summarize-para", label: "Summarize paragraph" },
];

export function ReadingTutorDrawer({
  attemptId,
  questionN,
  open,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<
    Awaited<ReturnType<typeof getPracticeTutorMessages>>
  >([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void getPracticeTutorMessages(attemptId)
      .then(setMessages)
      .catch(() => setError("Could not load tutor thread"));
  }, [open, attemptId]);

  async function send(payload: {
    message?: string;
    chipId?: string;
    questionN?: number;
  }) {
    setSending(true);
    setError(null);
    try {
      const reply = await askPracticeTutor(attemptId, {
        ...payload,
        questionN: payload.questionN ?? questionN ?? undefined,
      });
      const refreshed = await getPracticeTutorMessages(attemptId);
      setMessages(refreshed.length ? refreshed : [...messages, reply]);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tutor unavailable");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">Reading Tutor</p>
            <p className="text-xs text-muted">
              Passage-scoped · {questionN != null ? `Q${questionN}` : "general"}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-slate-500">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={sending}
            onClick={() => void send({ chipId: chip.id })}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-navy hover:bg-slate-100"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Ask about this passage only — for example why an option is wrong, or
            whether a claim is Not Given versus False.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
              m.role === "user"
                ? "ml-auto bg-navy text-white"
                : "bg-slate-100 text-slate-800",
            )}
          >
            {m.content}
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <form
        className="flex gap-2 border-t border-slate-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          void send({ message: input.trim() });
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this passage…"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <Button type="submit" disabled={sending || !input.trim()} size="sm">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
