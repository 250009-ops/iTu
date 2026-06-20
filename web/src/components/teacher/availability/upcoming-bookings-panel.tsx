"use client";

import { useTeacherAvailability } from "@/contexts/teacher-availability-context";
import { cn } from "@/lib/utils";

export function UpcomingBookingsPanel() {
  const { availability } = useTeacherAvailability();
  const { upcoming, slotDuration, bufferMinutes } = availability;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold text-navy">Upcoming</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-muted">
          {upcoming.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {upcoming.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <p className="text-sm font-medium text-navy">No bookings yet</p>
            <p className="mt-1 text-xs text-muted">
              Booked speaking sessions appear here once students reserve your
              slots.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {upcoming.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    item.colors.bg,
                    item.colors.text,
                  )}
                >
                  {item.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">
                    {item.studentName}
                  </p>
                  <p className="text-xs text-muted">{item.label}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-4 py-2.5 text-center text-[10px] text-muted">
        {slotDuration}-min slots ·{" "}
        {bufferMinutes === 0 ? "No buffer" : `${bufferMinutes}m buffer`}
      </div>
    </div>
  );
}
