"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createSupportTicket } from "@/lib/api/support";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const channels = [
  {
    id: "chat",
    icon: MessageCircle,
    title: "Live chat",
    detail: "Typical reply in under 5 minutes",
    accent: "bg-sky-100 text-sky-600",
    action: "Start chat",
  },
  {
    id: "email",
    icon: Mail,
    title: "Email support",
    detail: "support@itestu.uz",
    accent: "bg-violet-100 text-violet-600",
    action: "Send email",
  },
  {
    id: "phone",
    icon: Phone,
    title: "Call us",
    detail: "+1 800 IELTS 01 · Mon–Fri",
    accent: "bg-emerald-100 text-emerald-600",
    action: "Call now",
  },
] as const;

const faqs = [
  {
    q: "When are my results released?",
    a: "Band scores are released only after your Speaking session is completed and all Writing and Speaking grading is finished. Listening and Reading are auto-scored, but the full report stays hidden until the whole mock is graded.",
  },
  {
    q: "Can I pause or restart a section during the exam?",
    a: "No. To stay faithful to the official computer-delivered IELTS, timers are server-authoritative with no pause or rewind. Each section auto-submits when its timer ends.",
  },
  {
    q: "How do I reschedule my mock day or Speaking slot?",
    a: "Open Mock Day Hub before your scheduled date and use the reschedule option, or contact support. Speaking slots depend on examiner availability.",
  },
  {
    q: "I disagree with my Writing or Speaking band — what can I do?",
    a: "You can raise a regrade request from your results. A senior examiner will review your submission against the IELTS rubric within the published SLA.",
  },
  {
    q: "What do I need for the device check?",
    a: "A stable internet connection, a working microphone and camera for Speaking, and a modern browser. The check-in flow verifies these before your exam begins.",
  },
];

export function HelpCenter() {
  const { toast } = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChannel(id: string, title: string) {
    if (id === "email") {
      window.location.href = "mailto:support@itestu.uz";
      return;
    }
    if (id === "phone") {
      window.location.href = "tel:+18004358701";
      return;
    }
    toast(title, {
      description: "Connecting you to a support agent…",
      variant: "info",
    });
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast("Add a subject and message", { variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        type: "technical_issue",
      });
      setSubject("");
      setMessage("");
      toast("Request submitted", {
        description: `Ticket ${ticket.ticketId} — our team will respond shortly.`,
        variant: "success",
      });
    } catch (err) {
      toast("Could not submit request", {
        description: getErrorMessage(err, "Please try again or email support."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <LifeBuoy className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy">
              Help &amp; Support
            </h1>
            <p className="text-sm text-muted">
              Find answers fast or reach our team directly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.id}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    channel.accent,
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <p className="mt-3 font-semibold text-navy">{channel.title}</p>
                <p className="mt-0.5 text-sm text-muted">{channel.detail}</p>
                <button
                  type="button"
                  onClick={() => handleChannel(channel.id, channel.title)}
                  className="mt-3 text-sm font-semibold text-sky-600 hover:text-sky-700"
                >
                  {channel.action} →
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <BookOpen className="h-4 w-4 text-muted" />
                <h2 className="font-semibold text-navy">
                  Frequently asked questions
                </h2>
              </div>
              <div className="divide-y divide-border">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div key={faq.q}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                        aria-expanded={isOpen}
                      >
                        <span className="font-medium text-navy">{faq.q}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                      {isOpen && (
                        <p className="px-5 pb-4 text-sm leading-relaxed text-muted">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form
              onSubmit={submitRequest}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-navy">Submit a request</h2>
              <p className="mt-0.5 text-sm text-muted">
                Can&apos;t find an answer? Send us a message.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="h-10 w-full rounded-lg border border-border bg-slate-50 px-3 text-sm placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Describe your issue…"
                  className="w-full resize-none rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Sending…" : "Send request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
