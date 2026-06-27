"use client";

import { useMemo, useState } from "react";
import { Gift, Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { GrantMockDialog } from "@/components/admin/students/grant-mock-dialog";
import { useAdminStudents } from "@/contexts/admin-students-context";
import type { Student } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

const examTypeLabels: Record<Student["examType"], string> = {
  academic: "Academic",
  general_training: "General Training",
};

type VerifiedFilter = "all" | "verified" | "unverified";

const verifiedFilterOptions: { value: VerifiedFilter; label: string }[] = [
  { value: "all", label: "All Students" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
];

export function StudentsTable() {
  const { students } = useAdminStudents();
  const [query, setQuery] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>("all");
  const [page, setPage] = useState(1);
  const [grantTarget, setGrantTarget] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesVerified =
        verifiedFilter === "all" ||
        (verifiedFilter === "verified" && s.emailVerified) ||
        (verifiedFilter === "unverified" && !s.emailVerified);
      const matchesQuery =
        !query.trim() ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.email.toLowerCase().includes(query.toLowerCase());
      return matchesVerified && matchesQuery;
    });
  }, [students, query, verifiedFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-semibold text-navy">All Students</h2>
          <p className="mt-0.5 text-sm text-muted">
            Grant a complimentary mock to any registered student.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search students…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-border bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <Select
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value as VerifiedFilter);
              setPage(1);
            }}
            className="h-9 w-full sm:w-40"
          >
            {verifiedFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">Student</th>
              <th className="px-5 py-3 sm:px-6">Email Status</th>
              <th className="px-5 py-3 sm:px-6">Exam Type</th>
              <th className="px-5 py-3 sm:px-6">Target Band</th>
              <th className="px-5 py-3 sm:px-6">Enrollments</th>
              <th className="px-5 py-3 sm:px-6">Joined</th>
              <th className="px-5 py-3 text-right sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-muted sm:px-6"
                >
                  No students found.
                </td>
              </tr>
            ) : (
              paged.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                        {student.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-navy">{student.name}</p>
                        <p className="text-xs text-muted">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    {student.emailVerified ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted sm:px-6">
                    {examTypeLabels[student.examType]}
                  </td>
                  <td className="px-5 py-4 font-semibold tabular-nums text-navy sm:px-6">
                    {student.targetBand != null ? student.targetBand.toFixed(1) : "—"}
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        student.enrollments > 0
                          ? "bg-navy/5 text-navy"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {student.enrollments}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted sm:px-6">{student.joined}</td>
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => setGrantTarget(student)}
                      >
                        <Gift className="h-4 w-4" />
                        Grant free mock
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted sm:px-6">
          <span>
            Page {safePage} of {pageCount} · {filtered.length} students
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {grantTarget && (
        <GrantMockDialog
          student={grantTarget}
          onClose={() => setGrantTarget(null)}
        />
      )}
    </div>
  );
}
