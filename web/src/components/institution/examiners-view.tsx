"use client";

import { useState } from "react";
import { Star, UserPlus, X } from "lucide-react";
import {
  getInstitutionExaminers,
  inviteExaminer,
} from "@/lib/api/institution";
import { useApiQuery } from "@/hooks/use-api-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import {
  EmptyState,
  LoadingRow,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/institution/ui";

export function InstitutionExaminersView() {
  const { data, loading, refresh } = useApiQuery(getInstitutionExaminers);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
      <PageHeader
        breadcrumb="Institution &gt; Examiners"
        title="Examiners"
        description="Your center's own examiners who grade your students' mocks."
        actions={
          <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite examiner
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total examiners" value={data?.summary.total ?? "—"} />
        <StatCard
          label="Active"
          value={data?.summary.active ?? "—"}
          accent="emerald"
        />
        <StatCard
          label="Pending invites"
          value={data?.summary.pendingInvitations ?? "—"}
          accent="amber"
        />
        <StatCard
          label="Sessions delivered"
          value={data?.summary.sessionsDelivered ?? "—"}
          accent="violet"
        />
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-white">
          <LoadingRow />
        </div>
      ) : !data?.examiners.length ? (
        <div className="rounded-xl border border-border bg-white">
          <EmptyState message="No examiners yet. Invite your first examiner." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.examiners.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                    {e.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-navy">{e.name}</p>
                    <p className="text-xs text-muted">{e.email}</p>
                  </div>
                </div>
                <StatusPill status={e.status} />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                  {e.speciality}
                </span>
                <div className="flex items-center gap-3 text-muted">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    {e.rating != null ? e.rating.toFixed(1) : "—"}
                  </span>
                  <span>{e.totalSessions} sessions</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <InviteExaminerModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => void refresh({ silent: true })}
      />
    </div>
  );
}

function InviteExaminerModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [speciality, setSpeciality] = useState<"WRITING" | "SPEAKING" | "BOTH">(
    "BOTH",
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      toast("Missing details", {
        description: "Enter a name and email.",
        variant: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      await inviteExaminer({ name: name.trim(), email: email.trim(), speciality });
      toast("Invitation sent", {
        description: "The examiner will receive a setup link by email.",
        variant: "success",
      });
      setName("");
      setEmail("");
      setSpeciality("BOTH");
      onInvited();
      onClose();
    } catch (err) {
      toast("Invite failed", {
        description: getErrorMessage(err, "Could not invite examiner."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Invite examiner" className="max-w-md">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-navy">Invite examiner</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-4 p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">
            Full name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">
            Speciality
          </span>
          <select
            value={speciality}
            onChange={(e) =>
              setSpeciality(e.target.value as "WRITING" | "SPEAKING" | "BOTH")
            }
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          >
            <option value="BOTH">Writing &amp; Speaking</option>
            <option value="WRITING">Writing only</option>
            <option value="SPEAKING">Speaking only</option>
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={submitting}
          onClick={handleSubmit}
        >
          Send invitation
        </Button>
      </div>
    </Modal>
  );
}
