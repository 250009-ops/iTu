"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getAvailability, scheduleSpeakingSlot } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  teacherId: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function SpeakingSlotDialog({
  enrollmentId,
  mockDateIso,
  teacherId,
  examinerName,
  onClose,
  onDone,
}: {
  enrollmentId: string;
  mockDateIso: string;
  teacherId: string;
  examinerName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const mockDate = mockDateIso.slice(0, 10);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getAvailability(mockDate, teacherId);
      setSlots(list.filter((s) => s.status === "available"));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load availability"));
    } finally {
      setLoading(false);
    }
  }, [mockDate, teacherId]);

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
        description: `${formatSlotTime(selectedSlot.startsAt)} with ${examinerName}`,
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

  const dateLabel = useMemo(
    () =>
      new Date(`${mockDate}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [mockDate],
  );

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
              {examinerName} · {dateLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading availability…
          </div>
        ) : slots.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No open slots for {examinerName} on this date. Try another day via
            reschedule or contact support.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-semibold",
                  selectedSlot?.id === slot.id
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-border bg-white text-foreground hover:bg-slate-50",
                )}
              >
                {formatSlotTime(slot.startsAt)}
              </button>
            ))}
          </div>
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
