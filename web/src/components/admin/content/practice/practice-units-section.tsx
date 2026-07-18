"use client";

import type { ReactNode } from "react";
import { PracticeUnitsTable } from "@/components/admin/content/practice/practice-units-table";
import type { AdminPracticeUnit } from "@/lib/api/admin";

type Props = {
  title: string;
  description?: string;
  units: AdminPracticeUnit[];
  onEdit: (id: string) => void;
  emptyMessage: string;
  actions?: ReactNode;
};

export function PracticeUnitsSection({
  title,
  description,
  units,
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
      <PracticeUnitsTable units={units} onEdit={onEdit} emptyMessage={emptyMessage} />
    </section>
  );
}
