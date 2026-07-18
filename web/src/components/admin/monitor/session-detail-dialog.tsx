"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  forceSubmitSession,
  getAdminSessionDetail,
  resumeSession,
  reviewSessionIntegrity,
  suspendSessionAdmin,
  type AdminSessionDetail,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";

type Props = {
  sessionCode: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

export function SessionDetailDialog({
  sessionCode,
  open,
  onClose,
  onUpdated,
}: Props) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<AdminSessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    void getAdminSessionDetail(sessionCode)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Failed to load session"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, sessionCode]);

  if (!open) return null;

  async function handleResume() {
    setActing(true);
    try {
      await resumeSession(sessionCode);
      toast("Session resumed", {
        description: "The student can continue their exam.",
        variant: "success",
      });
      onUpdated?.();
      const data = await getAdminSessionDetail(sessionCode);
      setDetail(data);
    } catch (err) {
      toast("Resume failed", {
        description: getErrorMessage(err, "Request failed"),
        variant: "error",
      });
    } finally {
      setActing(false);
    }
  }

  async function handleSuspend() {
    setActing(true);
    try {
      await suspendSessionAdmin(sessionCode);
      toast("Session suspended", {
        description: "Timer paused until you resume.",
        variant: "success",
      });
      onUpdated?.();
      const data = await getAdminSessionDetail(sessionCode);
      setDetail(data);
    } catch (err) {
      toast("Suspend failed", {
        description: getErrorMessage(err, "Request failed"),
        variant: "error",
      });
    } finally {
      setActing(false);
    }
  }

  async function handleForceSubmit() {
    setActing(true);
    try {
      await forceSubmitSession(sessionCode);
      toast("Section force-submitted", {
        description: "The active section was ended by admin.",
        variant: "success",
      });
      onUpdated?.();
      onClose();
    } catch (err) {
      toast("Force submit failed", {
        description: getErrorMessage(err, "Request failed"),
        variant: "error",
      });
    } finally {
      setActing(false);
    }
  }

  async function handleReview(decision: "clear" | "uphold") {
    setActing(true);
    try {
      await reviewSessionIntegrity(sessionCode, decision);
      toast(
        decision === "clear" ? "Integrity cleared" : "Flag upheld",
        { variant: "success" },
      );
      onUpdated?.();
      onClose();
    } catch (err) {
      toast("Review failed", {
        description: getErrorMessage(err, "Request failed"),
        variant: "error",
      });
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-navy">Session details</h2>
            <p className="text-sm text-muted">{sessionCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-muted hover:text-navy"
          >
            Close
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {detail && !loading && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Student</dt>
                <dd className="font-semibold text-navy">{detail.studentName}</dd>
              </div>
              <div>
                <dt className="text-muted">Skill</dt>
                <dd className="font-semibold capitalize text-navy">
                  {detail.skill ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">State</dt>
                <dd className="font-mono text-xs text-navy">{detail.state}</dd>
              </div>
              <div>
                <dt className="text-muted">Integrity</dt>
                <dd className="font-semibold capitalize text-navy">
                  {detail.integrity}
                </dd>
              </div>
              {detail.suspended && (
                <>
                  <div className="col-span-2">
                    <dt className="text-muted">Suspended</dt>
                    <dd className="font-semibold text-amber-700">
                      {detail.suspendReason ?? "unknown"}
                      {detail.suspendedAt
                        ? ` · ${new Date(detail.suspendedAt).toLocaleString()}`
                        : ""}
                    </dd>
                  </div>
                </>
              )}
            </dl>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-navy">
                Integrity log
              </h3>
              {detail.integrityLog.length === 0 ? (
                <p className="text-sm text-muted">No events recorded.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3 text-sm">
                  {detail.integrityLog.map((entry, i) => (
                    <li
                      key={`${entry.at}-${i}`}
                      className="flex items-start gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div>
                        <p className="font-medium text-navy">{entry.event}</p>
                        <p className="text-xs text-muted">
                          {new Date(entry.at).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {detail.suspended ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={acting}
                  onClick={() => void handleResume()}
                >
                  Resume session
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={acting}
                  onClick={() => void handleSuspend()}
                >
                  Suspend session
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                disabled={acting}
                onClick={() => void handleForceSubmit()}
              >
                Force submit section
              </Button>
              {detail.integrity === "flagged" && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={acting}
                    onClick={() => void handleReview("clear")}
                  >
                    Clear flag
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={acting}
                    onClick={() => void handleReview("uphold")}
                  >
                    Uphold flag
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
