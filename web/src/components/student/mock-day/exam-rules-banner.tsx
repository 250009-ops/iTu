import { AlertTriangle } from "lucide-react";
import { useStudentMockDayData } from "@/contexts/student-mock-day-context";

export function ExamRulesBanner() {
  const { data } = useStudentMockDayData();
  if (!data || data.status === "missed") return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <p className="text-amber-900" style={{ fontSize: "13px" }}>
        <span className="font-bold">Active Exam Rules:</span>{" "}
        {data.rules.join(" · ")}
      </p>
    </div>
  );
}
