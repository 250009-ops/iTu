"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageSquare, Send, User, X } from "lucide-react";
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
  unitTitle?: string;
};

type TutorMessage = Awaited<
  ReturnType<typeof getPracticeTutorMessages>
>[number];

const CHIPS = [
  { id: "why-not", label: "Why is this wrong?" },
  { id: "ng-vs-false", label: "NG or FALSE?" },
  { id: "paraphrase", label: "Show paraphrase" },
  { id: "scan-path", label: "Explain scan path" },
  { id: "summarize-para", label: "Summarise paragraph" },
];

export function ReadingTutorDrawer({
  attemptId,
  questionN,
  open,
  onClose,
  unitTitle,
}: Props) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void getPracticeTutorMessages(attemptId)
      .then(setMessages)
      .catch(() => setError("Could not load tutor thread"));
  }, [open, attemptId]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function send(payload: { message?: string; chipId?: string }) {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const reply = await askPracticeTutor(attemptId, {
        ...payload,
        questionN: questionN ?? undefined,
      });
      const refreshed = await getPracticeTutorMessages(attemptId);
      setMessages((prev) => (refreshed.length ? refreshed : [...prev, reply]));
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tutor unavailable");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close tutor"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-navy/20 lg:hidden"
      />
      <aside
        role="dialog"
        aria-label="Reading tutor"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm animate-practice-slide-in-right flex-col border-l border-slate-200 bg-white shadow-[-6px_0_32px_rgba(27,42,74,0.12)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
              <MessageSquare className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-navy">Reading Tutor</p>
              <p className="truncate text-[11px] text-slate-400">
                {unitTitle ? `Scoped to: ${unitTitle}` : "Passage-scoped"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-muted hover:text-navy"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            Passage context active
          </span>
          {questionN != null && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Q{questionN}
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-muted">
            AI Review Coach
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !sending && (
            <div className="flex gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <p className="max-w-[82%] rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-700">
                Hi — I&apos;m your Reading Tutor, scoped to this passage. Ask why
                an answer is wrong, how to find the evidence, or how a paraphrase
                works. Use a quick prompt below or type freely.
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={cn("flex gap-2.5", isUser && "flex-row-reverse")}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full border",
                    isUser
                      ? "border-navy bg-navy text-white"
                      : "border-slate-200 bg-slate-50 text-slate-500",
                  )}
                >
                  {isUser ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="max-w-[82%]">
                  <p
                    className={cn(
                      "whitespace-pre-line px-3.5 py-2.5 text-[13px] leading-relaxed",
                      isUser
                        ? "rounded-2xl rounded-br-sm bg-navy text-white"
                        : "rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 text-slate-700",
                    )}
                  >
                    {message.content}
                  </p>
                  {message.questionN != null && (
                    <p
                      className={cn(
                        "mt-1 text-[10.5px] text-slate-300",
                        isUser ? "text-right" : "text-left",
                      )}
                    >
                      Q{message.questionN}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <span className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                <span className="text-xs text-slate-400">
                  Analysing passage…
                </span>
              </span>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-brand-red">
              {error}
            </p>
          )}
          <div ref={endRef} />
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Quick prompts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={sending}
                onClick={() => void send({ chipId: chip.id })}
                className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11.5px] text-slate-600 transition-colors hover:bg-white disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <form
          className="flex shrink-0 items-end gap-2.5 border-t border-slate-200 px-4 py-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            void send({ message: input.trim() });
          }}
        >
          <textarea
            rows={2}
            value={input}
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) void send({ message: input.trim() });
              }
            }}
            placeholder="Ask about this passage…"
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none transition-colors focus:border-navy"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              input.trim() && !sending
                ? "bg-brand-red text-white hover:bg-brand-red-hover"
                : "bg-slate-100 text-slate-400",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </aside>
    </>
  );
}
