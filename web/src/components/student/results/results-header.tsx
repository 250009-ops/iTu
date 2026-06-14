"use client";

import { useRouter } from "next/navigation";
import { Download, FileText, Zap } from "lucide-react";
import { ResultsShellHeader } from "@/components/student/results/results-shell-header";
import { useStudentResultsData } from "@/contexts/student-results-context";
import {
  exportResultReport,
  printResultsReport,
} from "@/lib/student/export";

export function ResultsHeader() {
  const router = useRouter();
  const { data } = useStudentResultsData();
  if (!data) return null;

  return (
    <ResultsShellHeader
      title={data.title}
      subtitle={data.subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => exportResultReport(data)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            style={{ fontSize: "14px" }}
          >
            <Download size={16} />
            Download report
          </button>
          <button
            type="button"
            onClick={printResultsReport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            style={{ fontSize: "14px" }}
          >
            <FileText size={16} />
            Print / PDF
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
