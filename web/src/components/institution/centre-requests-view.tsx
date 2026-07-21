"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare } from "lucide-react";
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
import { LoadingRow, PageHeader, SectionCard } from "@/components/institution/ui";
import { PortalPage } from "@/components/portal/portal-page";

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

export function CentreRequestsView() {
  const { toast } = useToast();
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
    <PortalPage>
      <PageHeader
        breadcrumb="Institution &gt; Centre requests"
        title="Centre requests"
        description="Requests from your students and examiners. Resolve them here — platform billing and portal issues go through Help & Support in the profile menu."
      />

      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-600" />
            Inbox
            {openCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {openCount} open
              </span>
            ) : null}
          </span>
        }
      >
        {loading ? (
          <LoadingRow />
        ) : requests.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No requests from centre members yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {requests.map((req) => {
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
            })}
          </div>
        )}
      </SectionCard>
    </PortalPage>
  );
}
