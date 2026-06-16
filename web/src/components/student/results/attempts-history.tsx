"use client";

import { BarChart3, Download, TrendingUp } from "lucide-react";
import { useStudentResultsData } from "@/contexts/student-results-context";
import { exportAttemptsCsv, downloadResultsPdf } from "@/lib/student/export";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

function formatBand(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function BandCell({ value, delta }: { value: number | null; delta?: number }) {
  if (value == null) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex min-w-[2.25rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
          value >= 7
            ? "bg-emerald-50 text-emerald-700"
            : value >= 6
              ? "bg-sky-50 text-sky-700"
              : "bg-amber-50 text-amber-700",
        )}
      >
        {formatBand(value)}
      </span>
      {delta != null && (
        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600">
          <TrendingUp className="h-3 w-3" />+{delta}
        </span>
      )}
    </div>
  );
}

export function AttemptsHistory() {
  const { toast } = useToast();
  const { data } = useStudentResultsData();
  if (!data?.released) return null;

  async function handlePdfDownload(enrollmentCode: string) {
    try {
      await downloadResultsPdf(enrollmentCode);
    } catch (err) {
      toast("Could not download PDF", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
            All Attempts History
          </h3>
        </div>
        <button
          type="button"
          onClick={() => exportAttemptsCsv(data.attempts)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50"
          style={{ fontSize: "13px" }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 sm:px-6">Attempt</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Listening</th>
              <th className="px-3 py-3">Reading</th>
              <th className="px-3 py-3">Writing</th>
              <th className="px-3 py-3">Speaking</th>
              <th className="px-3 py-3">Overall</th>
              <th className="px-5 py-3 text-right sm:px-6" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.attempts.map((attempt) => (
              <tr key={attempt.id} className="transition-colors hover:bg-gray-50/60">
                <td className="px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-500">
                      {attempt.id}
                    </span>
                    {attempt.latest && (
                      <span className="rounded-md bg-navy px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Latest
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-gray-500">{attempt.date}</td>
                <td className="px-3 py-4">
                  <BandCell value={attempt.listening} />
                </td>
                <td className="px-3 py-4">
                  <BandCell value={attempt.reading} />
                </td>
                <td className="px-3 py-4">
                  <BandCell value={attempt.writing} />
                </td>
                <td className="px-3 py-4">
                  <BandCell value={attempt.speaking} />
                </td>
                <td className="px-3 py-4">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="font-bold text-navy">
                      {attempt.overall != null ? formatBand(attempt.overall) : "—"}
                    </span>
                    {attempt.overallDelta != null && (
                      <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600">
                        <TrendingUp className="h-3 w-3" />+{attempt.overallDelta}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-right sm:px-6">
                  <button
                    type="button"
                    onClick={() => void handlePdfDownload(attempt.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-navy"
                  >
                    PDF
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
