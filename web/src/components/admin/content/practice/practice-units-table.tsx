"use client";

import { Button } from "@/components/ui/button";
import { QUESTION_TYPE_LABELS } from "@/lib/admin/content/factories";
import type { AdminPracticeUnit } from "@/lib/api/admin";

export type PracticeUnitsTableVariant =
  | "default"
  | "reading-passage"
  | "reading-drill"
  | "listening-drill";

type Props = {
  units: AdminPracticeUnit[];
  onEdit: (id: string) => void;
  emptyMessage?: string;
  variant?: PracticeUnitsTableVariant;
};

function formatQuestionType(type: string | null | undefined): string {
  if (!type) return "—";
  return QUESTION_TYPE_LABELS[type as keyof typeof QUESTION_TYPE_LABELS] ?? type;
}

export function PracticeUnitsTable({
  units,
  onEdit,
  emptyMessage,
  variant = "default",
}: Props) {
  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-muted">
        {emptyMessage ?? "No practice units yet."}
      </div>
    );
  }

  const showPassagePart = variant === "reading-passage";
  const showQuestionFormat =
    variant === "reading-drill" || variant === "listening-drill";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-muted">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Title</th>
            {showPassagePart && <th className="px-4 py-3">Passage</th>}
            {showQuestionFormat && <th className="px-4 py-3">Format</th>}
            {!showPassagePart && !showQuestionFormat && (
              <th className="px-4 py-3">Type</th>
            )}
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
              {showPassagePart && (
                <td className="px-4 py-3">
                  {u.passagePart ? `Passage ${u.passagePart}` : "—"}
                </td>
              )}
              {showQuestionFormat && (
                <td className="px-4 py-3">{formatQuestionType(u.questionType)}</td>
              )}
              {!showPassagePart && !showQuestionFormat && (
                <td className="px-4 py-3 text-xs">{u.type.replace(/_/g, " ")}</td>
              )}
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
