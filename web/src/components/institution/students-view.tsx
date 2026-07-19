"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, UserPlus, X } from "lucide-react";
import {
  approveStudent,
  getInstitutionStudents,
  inviteStudent,
  rejectStudent,
} from "@/lib/api/institution";
import { useApiQuery } from "@/hooks/use-api-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import {
  BandPill,
  EmptyState,
  LoadingRow,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/institution/ui";
import { EnrollWizard } from "@/components/institution/enroll-wizard";

const TABS = [
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "all", label: "All" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function InstitutionStudentsView() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("status") as TabId) ?? "active";
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "active",
  );
  const [enrollStudent, setEnrollStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const { toast } = useToast();

  const { data, loading, refresh } = useApiQuery(
    () => getInstitutionStudents(tab),
    [tab],
  );

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await approveStudent(id);
      toast("Student approved", { variant: "success" });
      await refresh({ silent: true });
    } catch (err) {
      toast("Action failed", {
        description: getErrorMessage(err, "Could not approve student."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await rejectStudent(id);
      toast("Student rejected", { variant: "info" });
      await refresh({ silent: true });
    } catch (err) {
      toast("Action failed", {
        description: getErrorMessage(err, "Could not reject student."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
      <PageHeader
        breadcrumb="Institution &gt; Students"
        title="Students"
        description="Add students, approve sign-ups, and enroll them into mock exams."
        actions={
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add student
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={data?.summary.total ?? "—"} />
        <StatCard
          label="Active"
          value={data?.summary.active ?? "—"}
          accent="emerald"
        />
        <StatCard
          label="Pending"
          value={data?.summary.pending ?? "—"}
          accent="amber"
        />
        <StatCard
          label="Reached band 7+"
          value={data?.summary.reachedBand7 ?? "—"}
          accent="violet"
        />
      </div>

      <SectionCard>
        <div className="flex items-center gap-1 border-b border-border px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                tab === t.id
                  ? "bg-navy text-white"
                  : "text-muted hover:bg-slate-100",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingRow />
        ) : !data?.students.length ? (
          <EmptyState message="No students in this view yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Target</th>
                  <th className="px-5 py-3 font-medium">Mocks</th>
                  <th className="px-5 py-3 font-medium">Latest band</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-navy">{s.name}</p>
                      <p className="text-xs text-muted">{s.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {s.targetBand ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-muted">{s.mocksTaken}</td>
                    <td className="px-5 py-3">
                      <BandPill band={s.latestBand} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {s.status === "active" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setEnrollStudent({ id: s.id, name: s.name })
                            }
                          >
                            <UserPlus className="h-4 w-4" />
                            Enroll
                          </Button>
                        )}
                        {s.status === "pending" && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={busyId === s.id}
                              onClick={() => handleApprove(s.id)}
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === s.id}
                              onClick={() => handleReject(s.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <EnrollWizard
        open={enrollStudent != null}
        studentId={enrollStudent?.id ?? ""}
        studentName={enrollStudent?.name}
        onClose={() => setEnrollStudent(null)}
        onEnrolled={() => {
          void refresh({ silent: true });
        }}
      />

      <AddStudentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setTab("pending");
          void refresh({ silent: true });
        }}
      />
    </div>
  );
}

function AddStudentModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      toast("Missing details", {
        description: "Enter the student's full name and email.",
        variant: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      await inviteStudent({ name: name.trim(), email: email.trim() });
      toast("Student invited", {
        description: "They will receive an email to set their password.",
        variant: "success",
      });
      setName("");
      setEmail("");
      onAdded();
      onClose();
    } catch (err) {
      toast("Invite failed", {
        description: getErrorMessage(err, "Could not add student."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Add student" className="max-w-md">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-navy">Add student</h2>
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
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Student name"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="student@example.com"
          />
        </label>
        <p className="text-xs text-muted">
          The student receives an email to set their password. They appear under
          Pending until you approve them.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={submitting}
            onClick={() => void handleSubmit()}
          >
            Send invite
          </Button>
        </div>
      </div>
    </Modal>
  );
}
