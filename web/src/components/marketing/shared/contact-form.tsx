"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getErrorMessage } from "@/lib/api/errors";
import { submitContactInquiry } from "@/lib/api/support";
import { cn } from "@/lib/utils";

const TOPICS = ["General", "Technical", "Billing", "Examiner", "Institution", "Press"] as const;

export function ContactForm() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("General");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h3 className="mt-4 text-xl font-bold text-navy">Message sent</h3>
        <p className="mt-2 text-sm text-muted">
          Thanks for reaching out — we&apos;ll get back to you within one business day.
        </p>
        {ticketId ? (
          <p className="mt-1 text-xs font-semibold text-emerald-700">Reference: {ticketId}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
          const ticket = await submitContactInquiry({
            name: name.trim(),
            email: email.trim(),
            topic,
            message: message.trim(),
          });
          setTicketId(ticket.ticketId);
          setSubmitted(true);
          setName("");
          setEmail("");
          setMessage("");
        } catch (err) {
          setError(getErrorMessage(err, "Could not send your message. Please try again."));
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <h2 className="text-2xl font-bold text-navy">Send us a message</h2>
      <p className="mt-1 text-sm text-muted">We&apos;ll get back to you within one business day.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-foreground">Your name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Johnson"
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-4 text-sm placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Email address</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@email.com"
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-4 text-sm placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-foreground">Topic</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                topic === t ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-border hover:text-navy",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-foreground">Message</label>
        <textarea
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you need help with…"
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-base font-semibold text-white shadow-lg shadow-brand-red/30 transition-all hover:bg-brand-red-hover hover:-translate-y-0.5"
      >
        {submitting ? "Sending..." : "Send message"} <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
