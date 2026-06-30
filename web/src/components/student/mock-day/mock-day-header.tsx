"use client";

import { Headphones } from "lucide-react";
import { MockDayShellHeader } from "@/components/student/mock-day/mock-day-shell-header";
import { useStudentMockDayData } from "@/contexts/student-mock-day-context";

export function MockDayHeader() {
  const { data } = useStudentMockDayData();
  if (!data || data.status === "missed") return null;
  const { dateLabel, examTitle, mockId } = data;

  return (
    <div className="bg-white">
      <MockDayShellHeader
        subtitle={`${dateLabel} · ${examTitle} · ${mockId}`}
        showSupport={false}
      />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 pb-4 lg:px-8">
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2">
          {["Network", "Mic", "Camera"].map((label) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {label}
            </span>
          ))}
        </div>
        <a
          href={`mailto:support@itestu.uz?subject=Exam-day%20support%20-%20${mockId}`}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          style={{ fontSize: "13px" }}
        >
          <Headphones size={15} />
          Support
        </a>
      </div>
    </div>
  );
}
