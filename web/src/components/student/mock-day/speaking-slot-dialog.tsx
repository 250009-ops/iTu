"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { SpeakingSlotPicker } from "@/components/student/shared/speaking-slot-picker";
import { getAvailability, scheduleSpeakingSlot } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/errors";
import { formatSpeakingWallTime } from "@/lib/speaking/slot-grid";
import { localTodayIso } from "@/lib/student/datetime";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  teacherId: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

const FUTURE_HORIZON_DAYS = 28;

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localTodayIso(d);
}

function futureDateOptions(fromIso: string, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(addDaysIso(fromIso, i));
  }
  return out;
}

/** Use mock day, or today when mock day has passed but the student is still scheduling. */
function defaultAvailabilityDate(mockDateIso: string): string {
  const mockDate = mockDateIso.slice(0, 10);
  const today = localTodayIso();
  return mockDate < today ? today : mockDate;
}

function formatDateLabel(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function SpeakingSlotDialog({
  enrollmentId,
  mockDateIso,
  teacherId,
  examinerName,
  allowFutureDates = false,
  onClose,
  onDone,
}: {
  enrollmentId: string;
  mockDateIso: string;
  teacherId: string;
  examinerName: string;
  /** Granted mocks may book any open slot within the next 28 days. */
  allowFutureDates?: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const mockDate = mockDateIso.slice(0, 10);
  const today = localTodayIso();
  const dateOptions = useMemo(
    () =>
      allowFutureDates
        ? futureDateOptions(today, FUTURE_HORIZON_DAYS)
        : [defaultAvailabilityDate(mockDateIso)],
    [allowFutureDates, mockDateIso, today],
  );
  const [selectedDate, setSelectedDate] = useState(dateOptions[0] ?? today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDate(dateOptions[0] ?? today);
  }, [dateOptions, today]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedSlot(null);
    try {
      const list = await getAvailability(selectedDate, teacherId);
      setSlots(list.filter((s) => s.status === "available"));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load availability"));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, teacherId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canConfirm = Boolean(selectedSlot);

  async function handleConfirm() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      await scheduleSpeakingSlot(enrollmentId, {
        speakingSlotId: selectedSlot.id,
      });
      toast("Speaking slot scheduled", {
        description: `${formatDateLabel(selectedDate)} · ${formatSpeakingWallTime(selectedSlot.startsAt)} with ${examinerName}`,
        variant: "success",
      });
      onDone();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not schedule the speaking slot"));
    } finally {
      setSubmitting(false);
    }
  }

  const mockDayHint =
    !allowFutureDates && selectedDate !== mockDate
      ? `Mock day was ${formatDateLabel(mockDate)} · showing today's open slots`
      : allowFutureDates
        ? "Pick an hour, then a :00 / :20 / :40 slot · cannot be changed after booking"
        : null;

  return (
    <Modal open onClose={onClose} ariaLabel="Select speaking availability">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <CalendarClock size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Select speaking time</h2>
            <p className="text-sm text-muted">
              {examinerName} · {formatDateLabel(selectedDate)}
            </p>
            {mockDayHint && (
              <p className="text-xs text-amber-700">{mockDayHint}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
        {allowFutureDates && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {dateOptions.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
                  selectedDate === iso
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-border bg-white text-foreground hover:bg-slate-50",
                )}
              >
                {formatDateLabel(iso)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted">
            Loading availability…
          </div>
        ) : (
          <SpeakingSlotPicker
            slots={slots}
            selectedSlot={selectedSlot}
            onSelect={setSelectedSlot}
            emptyMessage={`No open :00 / :20 / :40 slots for ${examinerName} on ${formatDateLabel(selectedDate)}.${
              allowFutureDates
                ? " Try another date."
                : " Contact support if you need help."
            }`}
          />
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="bg-rose-600 hover:bg-rose-700"
          disabled={!canConfirm}
          loading={submitting}
          onClick={handleConfirm}
        >
          <Mic size={14} className="mr-1.5" />
          Confirm slot
        </Button>
      </div>
    </Modal>
  );
}
