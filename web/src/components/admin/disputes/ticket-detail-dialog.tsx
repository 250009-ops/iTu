"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { EnrollmentDetailDialog } from "@/components/admin/enrollments/enrollment-detail-dialog";
import { ReappointMockDialog } from "@/components/admin/enrollments/reappoint-mock-dialog";
import { SessionDetailDialog } from "@/components/admin/monitor/session-detail-dialog";
import { ticketTypeMeta } from "@/lib/admin/constants";
import {
  actionLabel,
  getDisputePlaybook,
  notifyCopy,
  type DisputeActionId,
} from "@/lib/admin/dispute-playbooks";
import type { Ticket } from "@/lib/admin/types";
import {
  getAdminDispute,
  refundOrder,
  reopenEnrollmentRegrade,
  updateTicket,
} from "@/lib/api/admin";
import { mapSingleDispute } from "@/lib/api/mappers/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { formatPrice } from "@/lib/format-price";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Props = {
  ticket: Ticket | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onResolve: (ticket: Ticket, checklistSummary: string) => Promise<void>;
};

function roleBadge(role: Ticket["reporterRole"]) {
  if (role === "teacher") return "Teacher";
  if (role === "student") return "Student";
  if (role === "admin") return "Admin";
  return "Reporter";
}

function isActionAvailable(action: DisputeActionId, ticket: Ticket): boolean {
  switch (action) {
    case "open_enrollment":
      return Boolean(ticket.enrollmentId);
    case "open_session":
      return Boolean(ticket.sessionCode);
    case "reappoint":
      return Boolean(ticket.enrollmentId);
    case "regrade_writing":
    case "regrade_speaking":
      return Boolean(ticket.enrollmentId);
    case "issue_refund":
      return Boolean(ticket.orderId) && ticket.orderStatus === "paid";
    case "open_orders":
    case "open_payouts":
      return true;
    default:
      return false;
  }
}

export function TicketDetailDialog({
  ticket: initialTicket,
  open,
  onClose,
  onUpdated,
  onResolve,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(initialTicket);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [resolveOpen, setResolveOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [regradeSkill, setRegradeSkill] = useState<"writing" | "speaking" | null>(
    null,
  );
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [reappointOpen, setReappointOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  const refreshTicket = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await getAdminDispute(id);
      setTicket(mapSingleDispute(data));
    } catch (err) {
      toast("Could not refresh ticket", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setTicket(initialTicket);
    setChecked({});
    if (open && initialTicket?.id) {
      void refreshTicket(initialTicket.id);
    }
  }, [open, initialTicket, refreshTicket]);

  const playbook = useMemo(
    () =>
      ticket
        ? getDisputePlaybook(ticket.type, ticket.reporterRole)
        : { checklist: [], actions: [] },
    [ticket],
  );

  if (!open || !ticket) return null;

  const typeMeta = ticketTypeMeta[ticket.type];
  const checklistSummary = playbook.checklist
    .filter((item) => checked[item.id])
    .map((item) => item.label)
    .join("; ");

  async function handleMarkInProgress() {
    setActing(true);
    try {
      await updateTicket(ticket!.id, { status: "IN_PROGRESS" });
      toast("Ticket in progress", {
        description: `${ticket!.ticketId} marked as in progress.`,
        variant: "success",
      });
      await refreshTicket(ticket!.id);
      onUpdated();
    } catch (err) {
      toast("Update failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setActing(false);
    }
  }

  async function handleRegrade(skill: "writing" | "speaking") {
    if (!ticket?.enrollmentId) return;
    setActing(true);
    try {
      await reopenEnrollmentRegrade(ticket.enrollmentId, {
        skill,
        reason: ticket.preview,
      });
      toast(`Regrade started · ${skill}`, {
        description: "Enrollment reopened for grading.",
        variant: "success",
      });
      setChecked((prev) => ({ ...prev, regrade: true }));
      await refreshTicket(ticket.id);
      onUpdated();
    } catch (err) {
      toast("Regrade failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setActing(false);
      setRegradeSkill(null);
    }
  }

  async function handleRefund() {
    if (!ticket?.orderId) return;
    setActing(true);
    try {
      await refundOrder(ticket.orderId, {
        reason: `Dispute ${ticket.ticketId}: ${ticket.preview}`,
      });
      toast("Refund issued", {
        description: ticket.orderCode ?? ticket.orderId,
        variant: "success",
      });
      setChecked((prev) => ({ ...prev, refund: true }));
      setRefundOpen(false);
      await refreshTicket(ticket.id);
      onUpdated();
    } catch (err) {
      toast("Refund failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setActing(false);
    }
  }

  function runAction(action: DisputeActionId) {
    if (!ticket) return;
    switch (action) {
      case "open_enrollment":
        setEnrollmentOpen(true);
        break;
      case "open_session":
        setSessionOpen(true);
        break;
      case "reappoint":
        setReappointOpen(true);
        break;
      case "regrade_writing":
        setRegradeSkill("writing");
        break;
      case "regrade_speaking":
        setRegradeSkill("speaking");
        break;
      case "issue_refund":
        setRefundOpen(true);
        break;
      case "open_orders":
        router.push("/admin/orders");
        break;
      case "open_payouts":
        router.push("/admin/orders#payouts");
        break;
      default:
        break;
    }
  }

  const studentName =
    ticket.relatedStudent ||
    ticket.relatedRef?.split(" · ")[0]?.trim() ||
    ticket.reporterName;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        ariaLabel={`Ticket ${ticket.ticketId}`}
        className="max-w-4xl"
      >
        <div className="flex max-h-[min(90vh,100dvh)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-navy">{ticket.ticketId}</h2>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                    typeMeta.pill,
                    "bg-slate-100",
                  )}
                >
                  {typeMeta.label}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-muted">
                  {ticket.priority}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-muted">
                  {ticket.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                Filed {ticket.date} · SLA {ticket.sla.label}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid flex-1 overflow-hidden lg:grid-cols-5">
            <div className="space-y-5 overflow-y-auto border-b border-border p-5 sm:p-6 lg:col-span-3 lg:border-b-0 lg:border-r">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing…
                </div>
              )}

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Reporter
                </p>
                <p className="mt-1 font-semibold text-navy">
                  {ticket.reporterName}{" "}
                  <span className="text-sm font-normal text-muted">
                    · {roleBadge(ticket.reporterRole)}
                  </span>
                </p>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Subject
                </p>
                <p className="mt-1 font-medium text-navy">{ticket.preview}</p>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Message
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {ticket.description || "—"}
                </p>
              </section>

              {(ticket.relatedRef ||
                ticket.enrollmentRef !== "—" ||
                ticket.sessionCode ||
                ticket.orderCode) && (
                <section className="rounded-xl border border-border bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Related context
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-navy">
                    {ticket.relatedRef && <li>{ticket.relatedRef}</li>}
                    {ticket.enrollmentRef !== "—" && (
                      <li>Enrollment · {ticket.enrollmentRef}</li>
                    )}
                    {ticket.sessionCode && (
                      <li>Session · {ticket.sessionCode}</li>
                    )}
                    {ticket.orderCode && (
                      <li>
                        Order · {ticket.orderCode}
                        {ticket.orderAmount != null
                          ? ` · ${formatPrice(ticket.orderAmount)}`
                          : ""}
                        {ticket.orderStatus ? ` · ${ticket.orderStatus}` : ""}
                      </li>
                    )}
                  </ul>
                </section>
              )}
            </div>

            <div className="flex flex-col overflow-y-auto p-5 sm:p-6 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Guided checklist
              </p>
              <ul className="mt-3 space-y-2">
                {playbook.checklist.map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={Boolean(checked[item.id])}
                        onChange={(e) =>
                          setChecked((prev) => ({
                            ...prev,
                            [item.id]: e.target.checked,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-border text-navy focus:ring-navy/20"
                      />
                      <span className="text-navy">{item.label}</span>
                    </label>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
                Actions
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {playbook.actions.map((action) => {
                  const available = isActionAvailable(action, ticket);
                  return (
                    <Button
                      key={action}
                      variant="secondary"
                      size="sm"
                      disabled={!available || acting}
                      className="justify-start"
                      onClick={() => runAction(action)}
                    >
                      {actionLabel(action)}
                      {!available && action !== "open_orders" && action !== "open_payouts" && (
                        <span className="ml-auto text-xs text-muted">N/A</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 sm:px-6">
            <p className="text-xs text-muted">
              Filed via {ticket.reporterRole === "teacher" ? "Teacher" : "Student"} Help
            </p>
            <div className="flex flex-wrap gap-2">
              {ticket.status !== "in_progress" && ticket.status !== "resolved" && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={acting}
                  onClick={() => void handleMarkInProgress()}
                >
                  <Clock3 className="h-4 w-4" />
                  Mark in progress
                </Button>
              )}
              {ticket.status !== "resolved" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setResolveOpen(true)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={resolveOpen}
        title="Resolve ticket"
        message={
          checklistSummary
            ? `Mark ${ticket.ticketId} (${ticket.reporterName}) as resolved?\n\nChecklist: ${checklistSummary}\n\n${notifyCopy(ticket.reporterRole)}`
            : `Mark ${ticket.ticketId} (${ticket.reporterName}) as resolved? ${notifyCopy(ticket.reporterRole)}`
        }
        confirmLabel={acting ? "Resolving…" : "Resolve ticket"}
        onConfirm={async () => {
          setActing(true);
          try {
            await onResolve(ticket, checklistSummary);
            setResolveOpen(false);
            onClose();
          } finally {
            setActing(false);
          }
        }}
        onCancel={() => setResolveOpen(false)}
      />

      <ConfirmDialog
        open={regradeSkill !== null}
        title={regradeSkill ? `Regrade ${regradeSkill}` : ""}
        message={
          regradeSkill
            ? `Reopen ${regradeSkill} for ${ticket.enrollmentRef}? This deletes the existing grade and notifies the assigned examiner.`
            : ""
        }
        confirmLabel={acting ? "Starting…" : "Start regrade"}
        onConfirm={() =>
          regradeSkill ? void handleRegrade(regradeSkill) : undefined
        }
        onCancel={() => setRegradeSkill(null)}
      />

      <ConfirmDialog
        open={refundOpen}
        title={ticket.orderCode ? `Refund ${ticket.orderCode}?` : "Issue refund?"}
        message={
          ticket.orderAmount != null
            ? `Issue a full refund of ${formatPrice(ticket.orderAmount)} for ${studentName}? This cancels the enrollment in admin records. Card reversal may still be required in Lemon Squeezy.`
            : "Issue a refund for this order?"
        }
        confirmLabel={acting ? "Processing…" : "Issue refund"}
        onConfirm={() => void handleRefund()}
        onCancel={() => setRefundOpen(false)}
      />

      {ticket.enrollmentId && (
        <>
          <EnrollmentDetailDialog
            enrollmentId={ticket.enrollmentId}
            open={enrollmentOpen}
            onClose={() => setEnrollmentOpen(false)}
            onUpdated={() => {
              void refreshTicket(ticket.id);
              onUpdated();
            }}
          />
          {reappointOpen && (
            <ReappointMockDialog
              enrollmentId={ticket.enrollmentId}
              enrollmentCode={ticket.enrollmentRef}
              studentName={studentName}
              adminGranted={ticket.enrollmentAdminGranted}
              onClose={() => setReappointOpen(false)}
              onDone={() => {
                void refreshTicket(ticket.id);
                onUpdated();
              }}
            />
          )}
        </>
      )}

      {ticket.sessionCode && (
        <SessionDetailDialog
          sessionCode={ticket.sessionCode}
          open={sessionOpen}
          onClose={() => setSessionOpen(false)}
          onUpdated={() => {
            void refreshTicket(ticket.id);
            onUpdated();
          }}
        />
      )}
    </>
  );
}
