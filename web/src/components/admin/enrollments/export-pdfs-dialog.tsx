"use client";

import { useMemo, useState } from "react";
import { FileText, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAdminEnrollments } from "@/contexts/admin-enrollments-context";
import {
  exportEnrollmentPdfs,
  exportWritingPdfs,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type ExportKind =
  | "band_reports"
  | "writing_both"
  | "writing_task1"
  | "writing_task2";

type Props = {
  open: boolean;
  onClose: () => void;
};

const EXPORT_OPTIONS: {
  id: ExportKind;
  label: string;
  description: string;
}[] = [
  {
    id: "band_reports",
    label: "Band reports (L/R/S/W)",
    description: "Overall mock band report per student.",
  },
  {
    id: "writing_both",
    label: "Writing Task 1 + Task 2",
    description: "AI highlights & criterion suggestions for both tasks.",
  },
  {
    id: "writing_task1",
    label: "Writing Task 1 only",
    description: "Task Achievement feedback with AI highlights.",
  },
  {
    id: "writing_task2",
    label: "Writing Task 2 only",
    description: "Task Response feedback with AI highlights.",
  },
];

export function ExportPdfsDialog({ open, onClose }: Props) {
  const { enrollments } = useAdminEnrollments();
  const { toast } = useToast();
  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportKind, setExportKind] = useState<ExportKind>("band_reports");
  const [exporting, setExporting] = useState(false);

  const sorted = useMemo(
    () =>
      [...enrollments].sort((a, b) =>
        a.enrollmentId.localeCompare(b.enrollmentId),
      ),
    [enrollments],
  );

  const rangeIds = useMemo(() => {
    if (!fromCode.trim() && !toCode.trim()) return [];
    const from = fromCode.trim() || sorted[0]?.enrollmentId;
    const to = toCode.trim() || sorted[sorted.length - 1]?.enrollmentId;
    if (!from || !to) return [];
    return sorted
      .filter((e) => e.enrollmentId >= from && e.enrollmentId <= to)
      .map((e) => e.id);
  }, [fromCode, toCode, sorted]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectRange() {
    setSelected(new Set(rangeIds));
  }

  async function handleExport() {
    const ids = selected.size > 0 ? Array.from(selected) : rangeIds;
    if (ids.length === 0) {
      toast("Nothing selected", {
        description: "Pick a student range or select enrollments.",
        variant: "warning",
      });
      return;
    }

    setExporting(true);
    try {
      if (exportKind === "band_reports") {
        await exportEnrollmentPdfs(ids);
        toast("Band reports exported", {
          description: `Downloaded reports for ${ids.length} student${ids.length !== 1 ? "s" : ""}.`,
          variant: "success",
        });
      } else {
        const tasks: ("task1" | "task2")[] =
          exportKind === "writing_task1"
            ? ["task1"]
            : exportKind === "writing_task2"
              ? ["task2"]
              : ["task1", "task2"];
        await exportWritingPdfs(ids, tasks);
        toast("Writing PDFs exported", {
          description: `AI feedback PDF for ${ids.length} student${ids.length !== 1 ? "s" : ""}. Large exports may take a minute while AI runs.`,
          variant: "success",
        });
      }
      onClose();
    } catch (err) {
      toast("Export failed", {
        description: getErrorMessage(
          err,
          exportKind === "band_reports"
            ? "Only released results can be exported."
            : "Ensure students have submitted writing.",
        ),
        variant: "error",
      });
    } finally {
      setExporting(false);
    }
  }

  if (!open) return null;

  const exportCount = selected.size > 0 ? selected.size : rangeIds.length;
  const isWriting = exportKind !== "band_reports";

  return (
    <Modal open onClose={onClose} ariaLabel="Export PDFs">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-2">
          {isWriting ? (
            <PenLine className="h-5 w-5 text-violet-600" />
          ) : (
            <FileText className="h-5 w-5 text-navy" />
          )}
          <h2 className="text-lg font-bold text-navy">Export PDFs</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Select students and export type. Writing exports include AI highlights
          and per-criterion suggestions (TA/CC/LR/GRA).
        </p>

        <div className="mt-4 space-y-2">
          {EXPORT_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                exportKind === opt.id
                  ? "border-navy bg-slate-50"
                  : "border-border hover:bg-slate-50/80",
              )}
            >
              <input
                type="radio"
                name="export-kind"
                checked={exportKind === opt.id}
                onChange={() => setExportKind(opt.id)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-navy">{opt.label}</p>
                <p className="text-xs text-muted">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted">From ID</label>
            <input
              type="text"
              value={fromCode}
              onChange={(e) => setFromCode(e.target.value.toUpperCase())}
              placeholder="e.g. ENR-2001"
              className="mt-1 h-9 w-full rounded-lg border border-border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">To ID</label>
            <input
              type="text"
              value={toCode}
              onChange={(e) => setToCode(e.target.value.toUpperCase())}
              placeholder="e.g. ENR-2100"
              className="mt-1 h-9 w-full rounded-lg border border-border px-3 text-sm"
            />
          </div>
        </div>

        {rangeIds.length > 0 && (
          <button
            type="button"
            onClick={selectRange}
            className="mt-2 text-xs font-semibold text-sky-700 hover:underline"
          >
            Select {rangeIds.length} in range
          </button>
        )}

        <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-border">
          {sorted.map((e) => (
            <label
              key={e.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-slate-50",
                selected.has(e.id) && "bg-sky-50",
              )}
            >
              <input
                type="checkbox"
                checked={selected.has(e.id)}
                onChange={() => toggle(e.id)}
                className="rounded border-border"
              />
              <span className="font-mono text-xs font-semibold text-navy">
                {e.enrollmentId}
              </span>
              <span className="truncate text-sm text-muted">{e.studentName}</span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={exporting}
            onClick={() => void handleExport()}
          >
            Export {exportCount > 0 ? `(${exportCount})` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
