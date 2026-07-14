"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SectionProgress } from "@/lib/institution/types";

export function PageHeader({
  breadcrumb,
  title,
  description,
  actions,
}: {
  breadcrumb: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">{breadcrumb}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "navy",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "navy" | "red" | "emerald" | "amber" | "violet";
}) {
  const accentClass = {
    navy: "text-navy",
    red: "text-brand-red",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
  }[accent];

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={cn("mt-2 text-2xl font-bold", accentClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white shadow-sm",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          {title && <h2 className="text-sm font-bold text-navy">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  suspended: "bg-slate-100 text-slate-700 ring-slate-200",
  removed: "bg-slate-100 text-slate-600 ring-slate-200",
  enrolled: "bg-sky-50 text-sky-700 ring-sky-200",
  in_progress: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  awaiting_results: "bg-amber-50 text-amber-700 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  released: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  purchase: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  consume: "bg-rose-50 text-rose-700 ring-rose-200",
  adjustment: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function StatusPill({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset",
        statusStyles[status] ?? "bg-slate-100 text-slate-600 ring-slate-200",
      )}
    >
      {label}
    </span>
  );
}

export function ProgressDots({ progress }: { progress: SectionProgress }) {
  const skills: { key: keyof SectionProgress; label: string }[] = [
    { key: "listening", label: "L" },
    { key: "reading", label: "R" },
    { key: "writing", label: "W" },
    { key: "speaking", label: "S" },
  ];
  return (
    <div className="flex items-center gap-1">
      {skills.map((s) => (
        <span
          key={s.key}
          title={s.key}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
            progress[s.key]
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-400",
          )}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function BandPill({ band }: { band: number | null }) {
  if (band == null) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <span className="inline-flex items-center rounded-md bg-navy px-2 py-0.5 text-xs font-bold text-white">
      {band.toFixed(1)}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-12 text-center text-sm text-muted">{message}</div>
  );
}

export function LoadingRow({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      {message}
    </div>
  );
}

export function formatUZS(amount: number, currency = "UZS"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}
