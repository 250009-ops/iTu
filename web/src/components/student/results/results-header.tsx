"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, CalendarDays, Download, Zap } from "lucide-react";
import { ResultsShellHeader } from "@/components/student/results/results-shell-header";
import { CertificateDialog } from "@/components/student/results/certificate/certificate-dialog";
import { useToast } from "@/components/ui/toast";
import { useStudentResultsData } from "@/contexts/student-results-context";
import { getErrorMessage } from "@/lib/api/errors";
import { formatBandDisplay } from "@/lib/api/mappers/student";
import { downloadResultsPdf } from "@/lib/student/export";
import type { StudentPortal } from "@/lib/student/portal";
import { cn } from "@/lib/utils";

export function ResultsHeader({ portal = "marketplace" }: { portal?: StudentPortal }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, selectAttempt } = useStudentResultsData();
  const [downloading, setDownloading] = useState(false);
  const [certOpen, setCertOpen] = useState(false);

  if (!data) return null;

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      await downloadResultsPdf(data!.enrollmentCode);
      toast("PDF downloaded", {
        description: "Your official band report is ready.",
        variant: "success",
      });
    } catch (err) {
      toast("Could not download PDF", {
        description: getErrorMessage(err, "Please try again in a moment."),
        variant: "error",
      });
    } finally {
      setDownloading(false);
    }
  }

  const attemptPicker =
    data.availableAttempts.length > 1 ? (
      <div
        role="tablist"
        aria-label="Select exam date"
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-slate-50/80 p-1 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {data.availableAttempts.map((attempt) => {
          const selected = attempt.enrollmentCode === data.selectedEnrollmentCode;
          const band =
            attempt.overallBand != null
              ? formatBandDisplay(attempt.overallBand)
              : null;
          const bandLine =
            attempt.partial
              ? band != null
                ? ` · Partial ${band}`
                : " · Partial"
              : band != null
                ? ` · Band ${band}`
                : "";
          return (
            <button
              key={attempt.enrollmentCode}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectAttempt(attempt.enrollmentCode)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-left transition-colors",
                selected
                  ? "bg-navy text-white shadow-sm"
                  : "text-gray-600 hover:bg-white hover:text-navy",
              )}
            >
              <CalendarDays
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  selected ? "text-sky-300" : "text-gray-400",
                )}
              />
              <span className="flex flex-col leading-tight">
                <span
                  className={cn(
                    "text-[13px] font-semibold tabular-nums",
                    selected ? "text-white" : "text-gray-800",
                  )}
                >
                  {attempt.dateLabel}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    selected ? "text-white/70" : "text-gray-500",
                    attempt.partial && (selected ? "text-amber-200" : "text-amber-600"),
                  )}
                >
                  {attempt.skillSummary}
                  {bandLine}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <>
      <ResultsShellHeader
        portal={portal}
        title={data.title}
        subtitle={data.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            {attemptPicker}
            {data.released && (
              <>
                <button
                  type="button"
                  onClick={() => setCertOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-brand-red/30 bg-brand-red/5 px-4 py-2.5 font-semibold text-brand-red transition-colors hover:bg-brand-red/10"
                  style={{ fontSize: "14px" }}
                >
                  <Award size={16} />
                  View Certificate
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadPdf()}
                  disabled={downloading}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                  style={{ fontSize: "14px" }}
                >
                  <Download size={16} />
                  {downloading ? "Downloading…" : "Download PDF"}
                </button>
              </>
            )}
            {portal === "marketplace" && (
              <button
                type="button"
                onClick={() => router.push("/student/browse")}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #E31837, #c01230)",
                  fontSize: "14px",
                }}
              >
                <Zap size={16} />
                Book Next Mock
              </button>
            )}
          </div>
        }
      />
      {data.released && (
        <CertificateDialog
          open={certOpen}
          onClose={() => setCertOpen(false)}
          data={data}
        />
      )}
    </>
  );
}
