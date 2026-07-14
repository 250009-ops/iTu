"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  LifeBuoy,
  Mail,
  Send,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import {
  createSupportTicket,
  getMySupportTickets,
  type MySupportTicket,
  type SupportTicketType,
} from "@/lib/api/support";
import { getMockDayHub, getReviewables } from "@/lib/api/students";
import { getTeacherSpeakingSessions } from "@/lib/api/teachers";
import {
  categoriesForRole,
  faqsForRole,
  ticketTypeLabel,
  type HelpRole,
} from "@/lib/portal/help-config";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "support@itestu.uz";

type RelatedOption = { value: string; label: string; enrollmentId?: string };

function statusStyles(status: string) {
  const s = status.toLowerCase();
  if (s === "resolved" || s === "closed") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (s.includes("progress")) {
    return "bg-sky-50 text-sky-700";
  }
  return "bg-amber-50 text-amber-800";
}

function formatTicketDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function HelpSupportView({ role }: { role: HelpRole }) {
  const { toast } = useToast();
  const categories = categoriesForRole(role);
  const faqs = faqsForRole(role);

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [type, setType] = useState<SupportTicketType>(categories[0].value);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [relatedValue, setRelatedValue] = useState("");
  const [relatedOptions, setRelatedOptions] = useState<RelatedOption[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<MySupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.value === type) ?? categories[0],
    [categories, type],
  );

  const portalLabel =
    role === "teacher"
      ? "Teacher Portal"
      : role === "admin"
        ? "Admin"
        : "Student Portal";

  async function loadTickets() {
    setLoadingTickets(true);
    try {
      const list = await getMySupportTickets();
      setTickets(list);
    } catch {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRelated() {
      if (role === "admin") {
        setRelatedOptions([]);
        setLoadingRelated(false);
        return;
      }
      setLoadingRelated(true);
      try {
        if (role === "student") {
          const [reviewables, mockDay] = await Promise.all([
            getReviewables().catch(() => []),
            getMockDayHub().catch(() => null),
          ]);
          const opts: RelatedOption[] = [];
          if (mockDay?.enrollment) {
            opts.push({
              value: mockDay.enrollment.id,
              enrollmentId: mockDay.enrollment.id,
              label: `${mockDay.enrollment.enrollmentCode} · ${mockDay.enrollment.packageTitle ?? "Current mock"} · upcoming`,
            });
          }
          for (const r of reviewables) {
            if (opts.some((o) => o.enrollmentId === r.enrollmentId)) continue;
            opts.push({
              value: r.enrollmentId,
              enrollmentId: r.enrollmentId,
              label: `${r.enrollmentCode} · ${r.package} · ${formatTicketDate(r.mockDate)}`,
            });
          }
          if (!cancelled) setRelatedOptions(opts);
        } else {
          const sessions = await getTeacherSpeakingSessions().catch(() => null);
          const opts: RelatedOption[] = [];
          const buckets = [
            ...(sessions?.today ?? []),
            ...(sessions?.upcoming ?? []),
            ...(sessions?.completed ?? []),
          ];
          for (const s of buckets) {
            const when = s.scheduledAt
              ? formatTicketDate(s.scheduledAt)
              : "unscheduled";
            opts.push({
              value: `${s.studentName} · ${s.packageTitle} · ${when}`,
              label: `${s.studentName} · ${s.packageTitle} · ${when}`,
            });
          }
          if (!cancelled) setRelatedOptions(opts);
        }
      } finally {
        if (!cancelled) setLoadingRelated(false);
      }
    }
    void loadRelated();
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    setRelatedValue("");
  }, [type]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast("Add a subject and message", { variant: "warning" });
      return;
    }
    if (
      selectedCategory.requiresRelated &&
      relatedOptions.length > 0 &&
      !relatedValue
    ) {
      toast("Link a related mock or session", {
        description: "This category needs context so Admin can act quickly.",
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const related = selectedCategory.requiresRelated
        ? relatedOptions.find((o) => o.value === relatedValue)
        : undefined;
      const ticket = await createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        type,
        enrollmentId: related?.enrollmentId,
        relatedRef: related?.label,
      });
      setSubject("");
      setMessage("");
      setRelatedValue("");
      toast("Request submitted", {
        description: `Ticket ${ticket.ticketId} is with Admin · priority set automatically.`,
        variant: "success",
      });
      await loadTickets();
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
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(14, 116, 144, 0.10), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(15, 23, 42, 0.06), transparent 50%)",
            }}
          />
          <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
            <div className="max-w-xl">
              <p className="text-xs font-medium text-muted">
                {portalLabel} &gt; Help &amp; Support
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white shadow-sm">
                  <LifeBuoy className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                  Help &amp; Support
                </h1>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {role === "teacher"
                  ? "Report session issues, student conduct, or payout questions. Every request lands in the Admin Disputes queue with the right category and priority."
                  : role === "admin"
                    ? "Internal tickets and billing follow-ups. Student and teacher requests already appear on Disputes — use this only when you need a tracked note."
                    : "Ask about results, examiners, payments, or exam-day tech. Pick a category so Admin sees the right ticket type — not a generic catch-all."}
              </p>
            </div>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-3 rounded-xl border border-border bg-white/80 px-4 py-3 text-sm shadow-sm transition-colors hover:border-navy/20 hover:bg-slate-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-navy">
                <Mail className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span>
                <span className="block font-semibold text-navy">Email support</span>
                <span className="text-muted">{SUPPORT_EMAIL}</span>
              </span>
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="xl:col-span-5">
            <div className="rounded-2xl border border-border bg-white shadow-sm">
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <h2 className="font-semibold text-navy">Common questions</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Quick answers for{" "}
                  {role === "teacher"
                    ? "examiners"
                    : role === "admin"
                      ? "ops"
                      : "candidates"}
                  .
                </p>
              </div>
              <div className="divide-y divide-border">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div key={faq.q}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
                        aria-expanded={isOpen}
                      >
                        <span className="text-sm font-medium text-navy">
                          {faq.q}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                      {isOpen && (
                        <p className="px-5 pb-4 text-sm leading-relaxed text-muted sm:px-6">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-6 xl:col-span-7">
            <form
              onSubmit={submitRequest}
              className="rounded-2xl border border-border bg-white shadow-sm"
            >
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <h2 className="font-semibold text-navy">Submit a request</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Category sets ticket type and SLA priority for Admin.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Category
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {categories.map((cat) => {
                      const active = type === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setType(cat.value)}
                          className={cn(
                            "rounded-xl border px-3.5 py-3 text-left transition-colors",
                            active
                              ? "border-navy bg-navy text-white shadow-sm"
                              : "border-border bg-slate-50/80 hover:border-navy/25 hover:bg-white",
                          )}
                        >
                          <span
                            className={cn(
                              "block text-sm font-semibold",
                              active ? "text-white" : "text-navy",
                            )}
                          >
                            {cat.label}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block text-xs leading-snug",
                              active ? "text-white/75" : "text-muted",
                            )}
                          >
                            {cat.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedCategory.requiresRelated && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                      {role === "teacher"
                        ? "Related session / student *"
                        : "Related mock *"}
                    </label>
                    <Select
                      value={relatedValue}
                      onChange={(e) => setRelatedValue(e.target.value)}
                      disabled={loadingRelated || relatedOptions.length === 0}
                      className="h-11"
                    >
                      <option value="">
                        {loadingRelated
                          ? "Loading…"
                          : relatedOptions.length === 0
                            ? "No linked items yet — describe in message"
                            : "Select…"}
                      </option>
                      {relatedOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={
                      role === "teacher"
                        ? "e.g. Student disrupted Speaking Part 2"
                        : "e.g. Writing Task 2 band feels too low"
                    }
                    className="h-11 w-full rounded-lg border border-border bg-slate-50 px-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                    Details *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="What happened, when, and what you need from Admin…"
                    className="w-full resize-none rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Sending…" : "Send request"}
                </button>
              </div>
            </form>

            <div className="rounded-2xl border border-border bg-white shadow-sm">
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <h2 className="font-semibold text-navy">Your requests</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Status updates when Admin resolves a ticket.
                </p>
              </div>
              <div className="divide-y divide-border">
                {loadingTickets ? (
                  <p className="px-5 py-8 text-center text-sm text-muted sm:px-6">
                    Loading requests…
                  </p>
                ) : tickets.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-5 py-10 text-center sm:px-6">
                    <Clock3 className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-navy">No requests yet</p>
                    <p className="max-w-sm text-xs text-muted">
                      Submitted tickets appear here and in the Admin Disputes queue.
                    </p>
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-navy">
                            {t.ticketId}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                              statusStyles(t.status),
                            )}
                          >
                            {t.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted">
                          {t.subject}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {ticketTypeLabel(t.type)} · {formatTicketDate(t.createdAt)}
                        </p>
                      </div>
                      {(t.status === "resolved" || t.status === "closed") && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Closed
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
