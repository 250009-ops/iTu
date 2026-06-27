"use client";

import { useMemo, useState } from "react";
import { Eye, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { TeacherDetailDrawer } from "@/components/admin/teachers/teacher-detail-drawer";
import { teacherStatusFilterOptions } from "@/lib/admin/constants";
import type { Examiner, TeacherSpeciality, TeacherStatus } from "@/lib/admin/types";
import { useAdminTeachers } from "@/contexts/admin-teachers-context";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const statusStyles: Record<
  TeacherStatus,
  { label: string; dot: string; pill: string }
> = {
  approved: {
    label: "Approved",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
  pending: {
    label: "Pending",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700",
  },
  suspended: {
    label: "Suspended",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700",
  },
};

const specialityStyles: Record<TeacherSpeciality, string> = {
  writing: "bg-violet-50 text-violet-700",
  speaking: "bg-rose-50 text-rose-700",
  both: "bg-sky-50 text-sky-700",
};

const specialityLabels: Record<TeacherSpeciality, string> = {
  writing: "Writing",
  speaking: "Speaking",
  both: "Both",
};

function ActionButton({
  teacher,
  onAction,
}: {
  teacher: Examiner;
  onAction: (teacher: Examiner) => void;
}) {
  if (teacher.status === "pending") {
    return (
      <Button
        variant="primary"
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700"
        onClick={() => onAction(teacher)}
      >
        Approve
      </Button>
    );
  }
  if (teacher.status === "suspended") {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        onClick={() => onAction(teacher)}
      >
        Reinstate
      </Button>
    );
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      className="border-rose-200 text-brand-red hover:bg-rose-50"
      onClick={() => onAction(teacher)}
    >
      Suspend
    </Button>
  );
}

export function ExaminersTable() {
  const { examiners: rows, updateStatus } = useAdminTeachers();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TeacherStatus>("all");
  const [pending, setPending] = useState<Examiner | null>(null);
  const [viewTeacher, setViewTeacher] = useState<Examiner | null>(null);
  const { toast } = useToast();

  const nextStatus: Record<TeacherStatus, TeacherStatus> = {
    pending: "approved",
    suspended: "approved",
    approved: "suspended",
  };

  const actionVerb: Record<TeacherStatus, string> = {
    pending: "Approve",
    suspended: "Reinstate",
    approved: "Suspend",
  };

  async function applyAction() {
    if (!pending) return;
    const target = nextStatus[pending.status];
    const verb = actionVerb[pending.status];
    try {
      await updateStatus(pending.id, target);
      toast(`${pending.name} ${verb.toLowerCase()}d`, {
        variant: target === "suspended" ? "warning" : "success",
      });
    } catch {
      toast("Failed to update teacher status", { variant: "warning" });
    }
    setPending(null);
  }

  const filtered = useMemo(() => {
    return rows.filter((t) => {
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;
      const matchesQuery =
        !query.trim() ||
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.email.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [rows, query, statusFilter]);

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 className="font-semibold text-navy">All Examiners</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search teachers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | TeacherStatus)
            }
            className="h-9 w-full sm:w-36"
          >
            {teacherStatusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">Teacher</th>
              <th className="px-5 py-3 sm:px-6">Status</th>
              <th className="px-5 py-3 sm:px-6">Rating</th>
              <th className="px-5 py-3 sm:px-6">Sessions</th>
              <th className="px-5 py-3 sm:px-6">Total Earned</th>
              <th className="px-5 py-3 sm:px-6">Joined</th>
              <th className="px-5 py-3 sm:px-6">Speciality</th>
              <th className="px-5 py-3 text-right sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-muted sm:px-6">
                  No teachers found.
                </td>
              </tr>
            ) : (
              filtered.map((teacher) => {
                const status = statusStyles[teacher.status];
                return (
                  <tr key={teacher.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                          {teacher.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-navy">{teacher.name}</p>
                          <p className="text-xs text-muted">{teacher.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          status.pill,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      {teacher.rating != null ? (
                        <span className="flex items-center gap-1 font-semibold text-navy">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {teacher.rating}
                        </span>
                      ) : (
                        <span className="text-muted">Not rated</span>
                      )}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-muted sm:px-6">
                      {teacher.sessions.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-semibold tabular-nums text-navy sm:px-6">
                      ${teacher.totalEarned.toLocaleString("en-US")}
                    </td>
                    <td className="px-5 py-4 text-muted sm:px-6">{teacher.joined}</td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          specialityStyles[teacher.speciality],
                        )}
                      >
                        {specialityLabels[teacher.speciality]}
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton teacher={teacher} onAction={setPending} />
                        <button
                          type="button"
                          onClick={() => setViewTeacher(teacher)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 hover:text-navy"
                          aria-label={`View ${teacher.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `${actionVerb[pending.status]} ${pending.name}?` : ""}
        message={
          pending?.status === "approved"
            ? "Suspending will immediately remove this examiner from upcoming sessions. They will receive an email notification."
            : pending?.status === "pending"
              ? "Approving will allow this examiner to sign in and deliver sessions. They will receive login instructions by email."
              : "This examiner will be able to deliver and grade sessions again."
        }
        confirmLabel={pending ? actionVerb[pending.status] : "Confirm"}
        tone={pending?.status === "approved" ? "danger" : "default"}
        onConfirm={applyAction}
        onCancel={() => setPending(null)}
      />

      <TeacherDetailDrawer
        teacher={viewTeacher}
        onClose={() => setViewTeacher(null)}
      />
    </div>
  );
}
