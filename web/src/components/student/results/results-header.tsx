"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Zap } from "lucide-react";
import { ResultsShellHeader } from "@/components/student/results/results-shell-header";
import { useToast } from "@/components/ui/toast";
import { useStudentResultsData } from "@/contexts/student-results-context";
import { getErrorMessage } from "@/lib/api/errors";
import {
  downloadResultsPdf,
  exportResultReport,
  printResultsReport,
} from "@/lib/student/export";

export function ResultsHeader() {
  const router = useRouter();
  const { toast } = useToast();
  const { data } = useStudentResultsData();
  const [downloading, setDownloading] = useState(false);

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
        description: getErrorMessage(err, "Try the text report or print option."),
        variant: "error",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ResultsShellHeader
      title={data.title}
      subtitle={data.subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-3 print:hidden">
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
          <button
            type="button"
            onClick={() => exportResultReport(data)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            style={{ fontSize: "14px" }}
          >
            <FileText size={16} />
            Text report
          </button>
          <button
            type="button"
            onClick={printResultsReport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            style={{ fontSize: "14px" }}
          >
            <FileText size={16} />
            Print
          </button>
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
        </div>
      }
    />
  );
}
