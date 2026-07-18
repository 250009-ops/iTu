"use client";

import { Button } from "@/components/ui/button";
import type { AdminPracticeUnit } from "@/lib/api/admin";

type Props = {
  units: AdminPracticeUnit[];
  onEdit: (id: string) => void;
  emptyMessage?: string;
};

export function PracticeUnitsTable({ units, onEdit, emptyMessage }: Props) {
  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-muted">
        {emptyMessage ?? "No practice units yet."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-muted">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Questions</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-mono text-xs">{u.code}</td>
              <td className="px-4 py-3">{u.title}</td>
              <td className="px-4 py-3 text-xs">{u.type.replace(/_/g, " ")}</td>
              <td className="px-4 py-3">{u.questionCount}</td>
              <td className="px-4 py-3 capitalize">{u.status}</td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(u.id)}>
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
