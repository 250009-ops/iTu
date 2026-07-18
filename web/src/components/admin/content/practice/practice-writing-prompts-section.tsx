"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { AdminWritingPrompt } from "@/lib/api/admin";

type Props = {
  title: string;
  description?: string;
  prompts: AdminWritingPrompt[];
  onEdit: (id: string) => void;
  emptyMessage: string;
  actions?: ReactNode;
};

export function PracticeWritingPromptsSection({
  title,
  description,
  prompts,
  onEdit,
  emptyMessage,
  actions,
}: Props) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      {prompts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-muted">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {prompts.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                  <td className="px-4 py-3">{p.title}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(p.id)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
