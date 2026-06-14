"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  CreditCard,
  Monitor,
  Search,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import {
  disputePriorityFilterOptions,
  disputeStatusFilterOptions,
  ticketTypeMeta,
} from "@/lib/admin/constants";
import type {
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/lib/admin/types";
import { useAdminDisputes } from "@/contexts/admin-disputes-context";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const typeIcons: Record<TicketType, typeof ClipboardList> = {
  regrade_request: ClipboardList,
  teacher_no_show: UserX,
  technical_issue: Monitor,
  payment_dispute: CreditCard,
};

const priorityStyles: Record<
  TicketPriority,
  { label: string; dot: string; pill: string }
> = {
  urgent: {
    label: "Urgent",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700",
  },
  high: {
    label: "High",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700",
  },
  low: {
    label: "Low",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600",
  },
};

const statusStyles: Record<
  TicketStatus,
  { label: string; dot: string; pill: string }
> = {
  open: {
    label: "Open",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-700",
  },
  resolved: {
    label: "Resolved",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
};

const slaBarColors = {
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  rose: "bg-rose-500",
};

function SlaCell({
  sla,
}: {
  sla: Ticket["sla"];
}) {
  if (sla.state === "resolved") {
    return (
      <span className="text-sm font-semibold text-emerald-600">{sla.label}</span>
    );
  }

  if (sla.state === "overdue") {
    return (
      <span className="text-sm font-bold text-rose-600">{sla.label}</span>
    );
  }

  return (
    <div className="min-w-[88px]">
      <p
        className={cn(
          "text-sm font-semibold",
          sla.tone === "amber" ? "text-amber-600" : "text-emerald-600",
        )}
      >
        {sla.label}
      </p>
      <div className="mt-1.5 h-1 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full",
            slaBarColors[sla.tone ?? "emerald"],
          )}
          style={{ width: `${sla.progress ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export function DisputesTable() {
  const { tickets, resolveTicket } = useAdminDisputes();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | TicketPriority
  >("all");
  const [resolving, setResolving] = useState<Ticket | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const rows = tickets;

  async function handleResolve() {
    if (!resolving) return;
    const target = resolving;
    setBusy(true);
    try {
      await resolveTicket(target.id);
      toast(`${target.ticketId} resolved`, {
        description: `${target.studentName}'s ticket has been closed.`,
        variant: "success",
      });
      setResolving(null);
    } catch (err) {
      toast("Failed to resolve ticket", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((ticket) => {
      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || ticket.priority === priorityFilter;
      const matchesQuery =
        !query.trim() ||
        ticket.studentName.toLowerCase().includes(query.toLowerCase()) ||
        ticket.ticketId.toLowerCase().includes(query.toLowerCase()) ||
        ticket.preview.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesPriority && matchesQuery;
    });
  }, [rows, query, statusFilter, priorityFilter]);

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-semibold text-navy">All Tickets</h2>
        <p className="mt-0.5 text-sm text-muted">
          Sorted by priority — SLA countdown active for open tickets.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search tickets…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | TicketStatus)
            }
            className="h-9 w-full sm:w-36"
          >
            {disputeStatusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as "all" | TicketPriority)
            }
            className="h-9 w-full sm:w-36"
          >
            {disputePriorityFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">Ticket</th>
              <th className="px-5 py-3 sm:px-6">Student</th>
              <th className="px-5 py-3 sm:px-6">Type &amp; Preview</th>
              <th className="px-5 py-3 sm:px-6">Priority</th>
              <th className="px-5 py-3 sm:px-6">SLA</th>
              <th className="px-5 py-3 sm:px-6">Assignee</th>
              <th className="px-5 py-3 sm:px-6">Status</th>
              <th className="px-5 py-3 sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-muted sm:px-6"
                >
                  No tickets found.
                </td>
              </tr>
            ) : (
              filtered.map((ticket) => {
                const typeMeta = ticketTypeMeta[ticket.type];
                const TypeIcon = typeIcons[ticket.type];
                const priority = priorityStyles[ticket.priority];
                const status = statusStyles[ticket.status];
                const showActions = ticket.status !== "resolved";

                return (
                  <tr
                    key={ticket.id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4 sm:px-6">
                      <p className="font-bold text-navy">{ticket.ticketId}</p>
                      <p className="mt-0.5 text-xs text-muted">{ticket.date}</p>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                          {ticket.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-navy">
                            {ticket.studentName}
                          </p>
                          <p className="text-xs text-muted">
                            {ticket.country} · {ticket.enrollmentRef}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-xs px-5 py-4 sm:px-6">
                      <div className="flex items-start gap-2">
                        <div
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            typeMeta.iconTone,
                          )}
                        >
                          <TypeIcon className="h-3.5 w-3.5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-xs font-bold uppercase tracking-wide",
                              typeMeta.pill,
                            )}
                          >
                            {typeMeta.label}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                            {ticket.preview}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          priority.pill,
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", priority.dot)}
                        />
                        {priority.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <SlaCell sla={ticket.sla} />
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      {ticket.assignee ? (
                        <span className="text-sm text-navy">
                          {ticket.assignee}
                        </span>
                      ) : (
                        <span className="text-sm italic text-muted">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          status.pill,
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", status.dot)}
                        />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      {showActions ? (
                        <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3"
                            onClick={() =>
                              toast(`${ticket.ticketId} · ${ticket.studentName}`, {
                                description: ticket.preview,
                                variant: "info",
                              })
                            }
                          >
                            View
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => setResolving(ticket)}
                          >
                            Resolve
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 px-3"
                          onClick={() =>
                            toast(`${ticket.ticketId} · ${ticket.studentName}`, {
                              description: ticket.preview,
                              variant: "info",
                            })
                          }
                        >
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-5 py-4 sm:px-6">
        <p className="text-sm text-muted">
          Showing {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ConfirmDialog
        open={resolving !== null}
        title="Resolve ticket"
        message={
          resolving
            ? `Mark ${resolving.ticketId} (${resolving.studentName}) as resolved? The student will be notified.`
            : ""
        }
        confirmLabel={busy ? "Resolving…" : "Resolve ticket"}
        onConfirm={handleResolve}
        onCancel={() => setResolving(null)}
      />
    </div>
  );
}
