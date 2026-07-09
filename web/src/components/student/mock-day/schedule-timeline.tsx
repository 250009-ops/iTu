import { Activity } from "lucide-react";
import { Check } from "lucide-react";
import { useStudentMockDayData } from "@/contexts/student-mock-day-context";
import type { TimelineStatus } from "@/lib/api/mappers/student";
import { cn } from "@/lib/utils";

function TimelineDot({ status }: { status: TimelineStatus }) {
  if (status === "completed") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check size={11} strokeWidth={3} />
      </div>
    );
  }
  if (status === "current") {
    return (
      <div className="h-4 w-4 rounded-full bg-blue-500 ring-4 ring-blue-500/15" />
    );
  }
  return <div className="h-4 w-4 rounded-full border-2 border-gray-300 bg-white" />;
}

export function ScheduleTimeline() {
  const { data } = useStudentMockDayData();
  if (!data) return null;
  const items = data.schedule;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Activity size={16} className="text-gray-500" />
        <h2 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
          Today&apos;s Schedule
        </h2>
        <span className="ml-auto font-mono text-gray-400" style={{ fontSize: "11px" }}>
          {data.dateShort}
        </span>
      </div>

      <ol className="space-y-0">
        {items.map((item, index) => {
          const lineColor =
            item.status === "completed" ? "#a7f3d0" : "#e5e7eb";

          return (
            <li
              key={item.id}
              className={cn(
                "flex gap-3",
                item.isBreak && item.status !== "current" && "opacity-45",
              )}
            >
              <div className="flex flex-col items-center">
                <TimelineDot status={item.status} />
                {index < items.length - 1 && (
                  <div
                    className="w-0.5 flex-1"
                    style={{ minHeight: 14, background: lineColor }}
                  />
                )}
              </div>
              <div className="pb-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={cn(
                        "font-semibold",
                        item.status === "current"
                          ? "text-blue-600"
                          : item.status === "upcoming"
                            ? "text-gray-400"
                            : "text-gray-900",
                      )}
                      style={{ fontSize: "13px" }}
                    >
                      {item.title}
                    </p>
                    {item.detail && (
                      <p className="text-gray-500" style={{ fontSize: "12px" }}>
                        {item.detail}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 font-mono text-gray-400"
                    style={{ fontSize: "11px" }}
                  >
                    {item.time}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
