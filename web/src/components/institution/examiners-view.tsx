"use client";

import { useRef, useState } from "react";
import { MoreVertical, Star, UserPlus, X } from "lucide-react";
import {
  getInstitutionExaminers,
  inviteExaminer,
  removeExaminer,
  updateExaminerSpeciality,
} from "@/lib/api/institution";
import { useApiQuery } from "@/hooks/use-api-query";
import { useClickOutside } from "@/hooks/use-click-outside";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  LoadingRow,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/institution/ui";

type ExaminerSpeciality = "WRITING" | "SPEAKING" | "BOTH";

const SPECIALITY_OPTIONS: {
  value: ExaminerSpeciality;
  label: string;
}[] = [
  { value: "BOTH", label: "Writing & Speaking" },
  { value: "WRITING", label: "Writing only" },
  { value: "SPEAKING", label: "Speaking only" },
];

function toApiSpeciality(raw: string): ExaminerSpeciality {
  const upper = raw.toUpperCase();
  if (upper === "WRITING" || upper === "SPEAKING" || upper === "BOTH") {
    return upper;
  }
  return "BOTH";
}

function specialityLabel(raw: string): string {
  return (
    SPECIALITY_OPTIONS.find((o) => o.value === toApiSpeciality(raw))?.label ??
    raw
  );
}

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
            <ExaminerCard
              key={e.id}
              id={e.id}
              name={e.name}
              email={e.email}
              speciality={e.speciality}
              status={e.status}
              rating={e.rating}
              totalSessions={e.totalSessions}
              onChanged={() => void refresh({ silent: true })}
            />
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

function ExaminerCard({
  id,
  name,
  email,
  speciality,
  status,
  rating,
  totalSessions,
  onChanged,
}: {
  id: string;
  name: string;
  email: string;
  speciality: string;
  status: string;
  rating: number | null;
  totalSessions: number;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const currentSpeciality = toApiSpeciality(speciality);

  async function handleSpecialityChange(next: ExaminerSpeciality) {
    if (next === currentSpeciality) {
      setMenuOpen(false);
      return;
    }
    setBusy(true);
    setMenuOpen(false);
    try {
      await updateExaminerSpeciality(id, next);
      toast("Speciality updated", {
        description: `${name} is now set to ${specialityLabel(next.toLowerCase())}.`,
        variant: "success",
      });
      onChanged();
    } catch (err) {
      toast("Could not update speciality", {
        description: getErrorMessage(err, "Try again or reassign active work first."),
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await removeExaminer(id);
      toast(
        status === "pending" ? "Invitation cancelled" : "Examiner removed",
        {
          description:
            status === "pending"
              ? "The pending invite has been withdrawn."
              : `${name} no longer has access to your centre portal.`,
          variant: "success",
        },
      );
      setRemoveOpen(false);
      onChanged();
    } catch (err) {
      toast("Could not remove examiner", {
        description: getErrorMessage(
          err,
          "They may still have active mock assignments or grading work.",
        ),
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
              {name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy">{name}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <StatusPill status={status} />
            <div ref={menuRef} className="relative">
              <button
                type="button"
                disabled={busy}
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-navy disabled:opacity-50"
                aria-label={`Actions for ${name}`}
                aria-expanded={menuOpen}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg">
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Set speciality
                  </p>
                  {SPECIALITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSpecialityChange(option.value)}
                      className={cn(
                        "flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 disabled:opacity-50",
                        currentSpeciality === option.value &&
                          "bg-navy/5 font-semibold text-navy",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setMenuOpen(false);
                      setRemoveOpen(true);
                    }}
                    className="flex w-full px-3 py-2 text-left text-sm font-medium text-brand-red transition-colors hover:bg-rose-50 disabled:opacity-50"
                  >
                    {status === "pending"
                      ? "Cancel invitation"
                      : "Remove from centre"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {specialityLabel(speciality)}
          </span>
          <div className="flex items-center gap-3 text-muted">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              {rating != null ? rating.toFixed(1) : "—"}
            </span>
            <span>{totalSessions} sessions</span>
          </div>
        </div>
      </div>

      <Modal
        open={removeOpen}
        onClose={() => !busy && setRemoveOpen(false)}
        ariaLabel="Remove examiner"
        className="max-w-md"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-navy">
            {status === "pending" ? "Cancel invitation?" : "Remove examiner?"}
          </h2>
          <button
            type="button"
            onClick={() => setRemoveOpen(false)}
            disabled={busy}
            className="rounded-lg p-1 text-muted hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5 text-sm text-slate-600">
          {status === "pending" ? (
            <p>
              Cancel the invite for <span className="font-semibold text-navy">{name}</span>{" "}
              ({email})? They will not be able to join your centre.
            </p>
          ) : (
            <p>
              Remove <span className="font-semibold text-navy">{name}</span> from your
              centre? They will lose access to your students and grading queues.
            </p>
          )}
          <p className="text-xs text-muted">
            This cannot be undone if they still have active mock assignments or pending
            grading work — those must be cleared first.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => setRemoveOpen(false)}
          >
            Keep
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={busy}
            className="bg-brand-red hover:bg-brand-red-hover"
            onClick={() => void handleRemove()}
          >
            {status === "pending" ? "Cancel invite" : "Remove examiner"}
          </Button>
        </div>
      </Modal>
    </>
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
  const [speciality, setSpeciality] = useState<ExaminerSpeciality>("BOTH");
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
              setSpeciality(e.target.value as ExaminerSpeciality)
            }
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          >
            {SPECIALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
