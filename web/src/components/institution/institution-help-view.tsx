"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { HelpSupportView } from "@/components/portal/help-support-view";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import {
  getInstitutionSupportRequests,
  updateInstitutionSupportRequest,
  type InstitutionSupportRequest,
} from "@/lib/api/support";
import { ticketTypeLabel } from "@/lib/portal/help-config";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function reporterLabel(role: string | undefined) {
  if (role === "student") return "Student";
  if (role === "teacher") return "Examiner";
  return "Member";
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "resolved" || s === "closed") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (s.includes("progress")) {
    return "bg-sky-50 text-sky-700";
  }
  return "bg-amber-50 text-amber-800";
}

function CentreRequestsPanel() {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requests, setRequests] = useState<InstitutionSupportRequest[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await getInstitutionSupportRequests());
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolveRequest(id: string) {
    setBusyId(id);
    try {
      await updateInstitutionSupportRequest(id, "RESOLVED");
      toast("Request resolved", {
        description: "The member has been notified.",
        variant: "success",
      });
      await load();
    } catch (err) {
      toast("Could not update request", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  const openCount = requests.filter(
    (r) => !["resolved", "closed"].includes(r.status.toLowerCase()),
  ).length;

  return (
    <section className="rounded-2xl border border-border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-border px-5 py-4 text-left sm:px-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-semibold text-navy">Centre requests</h2>
            <p className="text-sm text-muted">
              From your students and examiners · {openCount} open
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading requests…
            </div>
          ) : requests.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted sm:px-6">
              No requests from centre members yet.
            </p>
          ) : (
            requests.map((req) => {
              const closed = ["resolved", "closed"].includes(
                req.status.toLowerCase(),
              );
              return (
                <div key={req.id} className="space-y-3 px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-navy">
                          {req.ticketId}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                            statusClass(req.status),
                          )}
                        >
                          {req.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-0.5 font-medium text-navy">
                        {req.subject}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {reporterLabel(req.reporter?.role)} ·{" "}
                        {req.reporter?.name ?? "Unknown"} ·{" "}
                        {ticketTypeLabel(req.type)} · {formatDate(req.createdAt)}
                      </p>
                      {req.relatedRef ? (
                        <p className="mt-1 text-xs text-muted">
                          Related: {req.relatedRef}
                        </p>
                      ) : null}
                    </div>
                    {!closed ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busyId === req.id}
                        onClick={() => void resolveRequest(req.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark resolved
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Closed
                      </span>
                    )}
                  </div>
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-muted">
                    {req.message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

export function InstitutionHelpView() {
  return (
    <div className="space-y-8">
      <CentreRequestsPanel />
      <HelpSupportView role="institution" />
    </div>
  );
}
