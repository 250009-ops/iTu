"use client";

import { AlertTriangle } from "lucide-react";

interface SubmitDialogProps {
  open: boolean;
  title: string;
  message: string;
  answered: number;
  total: number;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SubmitDialog({
  open,
  title,
  message,
  answered,
  total,
  confirmLabel = "Submit & continue",
  onConfirm,
  onCancel,
}: SubmitDialogProps) {
  if (!open) return null;
  const unanswered = total - answered;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{message}</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{answered}</p>
            <p className="text-xs font-medium text-emerald-600">Answered</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-2xl font-bold text-slate-500">{unanswered}</p>
            <p className="text-xs font-medium text-slate-400">Unanswered</p>
          </div>
        </div>

        <p className="mb-5 text-xs text-slate-400">
          Once submitted you cannot return to this section. This action is final, in
          line with official exam rules.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Keep working
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-hover"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
