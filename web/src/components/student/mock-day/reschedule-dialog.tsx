"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Loader2, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getAvailability, rescheduleBooking } from "@/lib/api/bookings";
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

const EXAM_START_TIMES = ["08:30", "09:00", "09:30", "10:00", "13:00"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function RescheduleDialog({
  enrollmentId,
  currentDateIso,
  currentTime,
  hasSpeaking = true,
  onClose,
  onDone,
}: {
  enrollmentId: string;
  currentDateIso: string;
  currentTime: string;
  hasSpeaking?: boolean;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [mockDate, setMockDate] = useState(currentDateIso.slice(0, 10));
  const [mockTime, setMockTime] = useState(currentTime || EXAM_START_TIMES[0]);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [speakingTeacherId, setSpeakingTeacherId] = useState<string | null>(
    null,
  );
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllSlots = useCallback(async () => {
    setSlotsLoading(true);
    setSpeakingTeacherId(null);
    setSelectedSlot(null);
    setFilteredSlots([]);
    try {
      const list = await getAvailability(mockDate);
      setAllSlots(list);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load speaking slots"));
    } finally {
      setSlotsLoading(false);
    }
  }, [mockDate]);

  const loadExaminerSlots = useCallback(async () => {
    if (!speakingTeacherId) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const list = await getAvailability(mockDate, speakingTeacherId);
      setFilteredSlots(list);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load speaking slots"));
    } finally {
      setSlotsLoading(false);
    }
  }, [mockDate, speakingTeacherId]);

  useEffect(() => {
    if (hasSpeaking) void loadAllSlots();
  }, [loadAllSlots, hasSpeaking]);

  useEffect(() => {
    if (hasSpeaking && speakingTeacherId) void loadExaminerSlots();
  }, [hasSpeaking, speakingTeacherId, loadExaminerSlots]);

  const examiners = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; name: string; slotCount: number }
    >();
    for (const slot of allSlots) {
      const entry = groups.get(slot.teacherId) ?? {
        id: slot.teacherId,
        name: slot.teacherName,
        slotCount: 0,
      };
      entry.slotCount += 1;
      groups.set(slot.teacherId, entry);
    }
    return [...groups.values()];
  }, [allSlots]);

  const selectedExaminer = examiners.find((e) => e.id === speakingTeacherId);

  const canConfirm = hasSpeaking
    ? Boolean(selectedSlot)
    : Boolean(mockDate && mockTime);

  async function handleConfirm() {
    if (hasSpeaking && !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      await rescheduleBooking(enrollmentId, {
        mockDate: new Date(`${mockDate}T${mockTime}:00`).toISOString(),
        mockTime,
        ...(hasSpeaking && selectedSlot
          ? { speakingSlotId: selectedSlot.id }
          : {}),
      });
      toast("Mock rescheduled", {
        description: hasSpeaking
          ? "Your new date and speaking slot are confirmed."
          : "Your new mock date and time are confirmed.",
        variant: "success",
      });
      await onDone();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Reschedule failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel="Reschedule mock"
      className="max-w-xl"
    >
      <div className="flex items-start justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Reschedule mock</h2>
          <p className="mt-0.5 text-sm text-muted">
            {hasSpeaking
              ? "Pick a new date, speaking examiner, and time slot."
              : "Pick a new date and start time for your upcoming mock."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-navy">
            <CalendarDays size={15} />
            New mock date
          </label>
          <Input
            type="date"
            min={todayIso()}
            value={mockDate}
            onChange={(e) => setMockDate(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy">
            Exam start time
          </label>
          <div className="flex flex-wrap gap-2">
            {EXAM_START_TIMES.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setMockTime(time)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-semibold",
                  mockTime === time
                    ? "border-navy bg-navy text-white"
                    : "border-border bg-white text-foreground hover:bg-slate-50",
                )}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {hasSpeaking && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy">
                Speaking examiner
              </label>
              {slotsLoading && examiners.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : examiners.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                  No Speaking examiners have open slots on this date. Try
                  another date.
                </div>
              ) : (
                <div className="space-y-2">
                  {examiners.map((examiner) => (
                    <button
                      key={examiner.id}
                      type="button"
                      onClick={() => setSpeakingTeacherId(examiner.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                        speakingTeacherId === examiner.id
                          ? "border-rose-500 bg-rose-50"
                          : "border-border bg-white hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                          <Mic size={15} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {examiner.name}
                          </p>
                          <p className="text-xs text-muted">
                            {examiner.slotCount} open slot
                            {examiner.slotCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      {speakingTeacherId === examiner.id && (
                        <Check size={16} className="text-rose-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {speakingTeacherId && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy">
                  Speaking time
                  {selectedExaminer && (
                    <span className="ml-1 font-normal text-muted">
                      · {selectedExaminer.name}
                    </span>
                  )}
                </label>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                    No open slots for this examiner on this date.
                  </div>
                ) : (
                  <div className="max-h-[32vh] overflow-y-auto rounded-xl border border-border bg-slate-50/50 p-3">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {filteredSlots.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm font-semibold",
                            selectedSlot?.id === slot.id
                              ? "border-rose-500 bg-rose-500 text-white"
                              : "border-border bg-white text-foreground hover:bg-slate-50",
                          )}
                        >
                          {formatSlotTime(slot.startsAt)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={!canConfirm}
          loading={submitting}
        >
          Confirm reschedule
        </Button>
      </div>
    </Modal>
  );
}
