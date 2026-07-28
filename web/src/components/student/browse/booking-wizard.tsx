"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/format-price";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  CreditCard,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  createBooking,
  getAvailability,
  getContentAvailability,
  listTeachers,
} from "@/lib/api/bookings";
import { getPaymentConfig } from "@/lib/api/payments";
import { getErrorMessage } from "@/lib/api/errors";
import type { BrowseProduct } from "@/lib/api/mappers/student";
import { ExamStartTimePicker } from "@/components/student/shared/exam-start-time-picker";
import { SpeakingSlotPicker } from "@/components/student/shared/speaking-slot-picker";
import {
  defaultExamStartTime,
  EXAM_START_TIMES,
  isMockTimeSelectionValid,
} from "@/lib/student/exam-start-times";
import { clampMockTimeForDate } from "@/lib/student/datetime";
import { formatSpeakingWallTime } from "@/lib/speaking/slot-grid";
import { cn } from "@/lib/utils";

type Teacher = {
  id: string;
  name: string;
  email: string;
  speciality: string;
  rating: number | null;
  status: string;
};

type Slot = {
  id: string;
  teacherId: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type WizardStepId =
  | "date"
  | "writing"
  | "speakingExaminer"
  | "speakingSlot"
  | "payment";

const STEP_LABELS: Record<WizardStepId, string> = {
  date: "Date & time",
  writing: "Writing examiner",
  speakingExaminer: "Speaking examiner",
  speakingSlot: "Speaking time",
  payment: "Payment",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildWizardSteps(product: BrowseProduct): WizardStepId[] {
  const steps: WizardStepId[] = ["date"];
  if (product.needsWriting) steps.push("writing");
  if (product.needsSpeaking) {
    steps.push("speakingExaminer");
    steps.push("speakingSlot");
  }
  steps.push("payment");
  return steps;
}

function needsExamStartTime(product: BrowseProduct) {
  return product.needsWriting || product.skillIds.length >= 4;
}

function dateStepHint(product: BrowseProduct) {
  if (product.skillIds.length >= 4) {
    return "All four skills take place on this single day.";
  }
  if (product.needsSpeaking && !product.needsWriting) {
    return "Your live Speaking session will take place on this date.";
  }
  if (product.needsWriting && !product.needsSpeaking) {
    return "Complete your Writing tasks on this date within the 60-minute window.";
  }
  return "Your exam sections take place on this single day.";
}

export function BookingWizard({
  product,
  onClose,
  initialWritingTeacherId,
  initialSpeakingTeacherId,
}: {
  product: BrowseProduct;
  onClose: () => void;
  initialWritingTeacherId?: string | null;
  initialSpeakingTeacherId?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const steps = useMemo(() => buildWizardSteps(product), [product]);

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex]!;

  const [mockDate, setMockDate] = useState(todayIso());
  const [mockTime, setMockTime] = useState(() => defaultExamStartTime(todayIso()));

  const [writingTeachers, setWritingTeachers] = useState<Teacher[]>([]);
  const [writingTeacherId, setWritingTeacherId] = useState<string | null>(
    initialWritingTeacherId ?? null,
  );
  const [speakingTeachers, setSpeakingTeachers] = useState<Teacher[]>([]);
  const [speakingTeacherId, setSpeakingTeacherId] = useState<string | null>(
    initialSpeakingTeacherId ?? null,
  );
  const [teachersLoading, setTeachersLoading] = useState(false);

  const previousMockDate = useRef(mockDate);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseBlocked, setPurchaseBlocked] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);

  useEffect(() => {
    void getPaymentConfig().then((cfg) => setPaymentsEnabled(cfg.paymentsEnabled));
  }, []);

  const priceLabel = formatPrice(product.price, product.currency);
  const selectedWritingTeacher = writingTeachers.find(
    (teacher) => teacher.id === writingTeacherId,
  );
  const selectedSpeakingTeacher = speakingTeachers.find(
    (teacher) => teacher.id === speakingTeacherId,
  );
  const showExamStartTime = needsExamStartTime(product);

  const loadWritingTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const list = await listTeachers("writing");
      setWritingTeachers(list);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load examiners"));
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  const loadSpeakingTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const list = await listTeachers("speaking");
      setSpeakingTeachers(list);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load examiners"));
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  const loadSpeakingExaminerAvailability = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const list = await getAvailability(mockDate);
      setSlots(list);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load speaking availability"));
    } finally {
      setSlotsLoading(false);
    }
  }, [mockDate]);

  const loadSpeakingSlots = useCallback(async () => {
    if (!speakingTeacherId) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const list = await getAvailability(mockDate, speakingTeacherId);
      setSlots(list);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load speaking slots"));
    } finally {
      setSlotsLoading(false);
    }
  }, [mockDate, speakingTeacherId]);

  useEffect(() => {
    let cancelled = false;
    setCheckingAvailability(true);
    void getContentAvailability(product.id)
      .then((result) => {
        if (cancelled) return;
        setPurchaseBlocked(result.canPurchase ? null : result.blockingReason ?? result.message);
      })
      .catch(() => {
        if (!cancelled) setPurchaseBlocked(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    if (currentStep === "writing" && writingTeachers.length === 0) {
      void loadWritingTeachers();
    }
    if (currentStep === "speakingExaminer") {
      if (speakingTeachers.length === 0) void loadSpeakingTeachers();
      void loadSpeakingExaminerAvailability();
    }
    if (currentStep === "speakingSlot") {
      void loadSpeakingSlots();
    }
  }, [
    currentStep,
    writingTeachers.length,
    speakingTeachers.length,
    loadWritingTeachers,
    loadSpeakingTeachers,
    loadSpeakingExaminerAvailability,
    loadSpeakingSlots,
  ]);

  useEffect(() => {
    if (previousMockDate.current === mockDate) return;
    previousMockDate.current = mockDate;
    setSpeakingTeacherId(null);
    setSelectedSlot(null);
    setSlots([]);
    setMockTime((current) => clampMockTimeForDate(mockDate, current));
  }, [mockDate]);

  const slotCountByTeacher = useMemo(() => {
    const counts = new Map<string, number>();
    for (const slot of slots) {
      counts.set(slot.teacherId, (counts.get(slot.teacherId) ?? 0) + 1);
    }
    return counts;
  }, [slots]);

  const canContinue = useMemo(() => {
    if (purchaseBlocked) return false;
    if (currentStep === "date") {
      if (!mockDate) return false;
      return showExamStartTime
        ? isMockTimeSelectionValid(mockDate, mockTime)
        : true;
    }
    if (currentStep === "writing") return Boolean(writingTeacherId);
    if (currentStep === "speakingExaminer") return Boolean(speakingTeacherId);
    if (currentStep === "speakingSlot") return Boolean(selectedSlot);
    if (currentStep === "payment") return true;
    return false;
  }, [
    currentStep,
    mockDate,
    mockTime,
    showExamStartTime,
    writingTeacherId,
    speakingTeacherId,
    selectedSlot,
    purchaseBlocked,
  ]);

  function goNext() {
    setError(null);
    if (stepIndex < steps.length - 1) setStepIndex((index) => index + 1);
  }

  function goBack() {
    setError(null);
    if (stepIndex > 0) setStepIndex((index) => index - 1);
  }

  async function handleConfirm() {
    if (purchaseBlocked) return;
    if (product.needsWriting && !writingTeacherId) return;
    if (product.needsSpeaking && (!speakingTeacherId || !selectedSlot)) return;

    setSubmitting(true);
    setError(null);
    let navigatingToCheckout = false;
    try {
      const bookingMockTime = showExamStartTime ? mockTime : EXAM_START_TIMES[0]!;
      const result = await createBooking({
        packageId: product.id,
        mockDate: new Date(`${mockDate}T${bookingMockTime}:00`).toISOString(),
        mockTime: bookingMockTime,
        ...(product.needsWriting && writingTeacherId
          ? { writingTeacherId }
          : {}),
        ...(product.needsSpeaking && selectedSlot && speakingTeacherId
          ? {
              speakingTeacherId,
              speakingSlotId: selectedSlot.id,
            }
          : {}),
        paymentMethod: "card",
      });

      if (result.status === "pending_payment" && result.checkoutUrl) {
        navigatingToCheckout = true;
        setRedirectingToCheckout(true);
        window.location.href = result.checkoutUrl;
        return;
      }

      toast("Booking confirmed", {
        description: `${product.title} booked · ${result.enrollmentCode}`,
        variant: "success",
      });
      onClose();
      router.push("/student/mock-day");
    } catch (err) {
      setError(getErrorMessage(err, "Booking failed. Please try again."));
    } finally {
      if (!navigatingToCheckout) {
        setSubmitting(false);
      }
    }
  }

  const isLastStep = stepIndex === steps.length - 1;

  return (
    <Modal open onClose={onClose} ariaLabel={`Book ${product.title}`} className="relative">
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy">Book {product.title}</h2>
            <p className="mt-0.5 text-sm text-muted">
              Step {stepIndex + 1} of {steps.length} · {STEP_LABELS[currentStep]}
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

        {checkingAvailability ? (
          <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-6 py-3 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking whether this mock is available for you…
          </div>
        ) : purchaseBlocked ? (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
            {purchaseBlocked}
          </div>
        ) : null}

        <div className="flex items-center gap-2 border-b border-border px-6 py-3">
          {steps.map((step, index) => (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  index < stepIndex
                    ? "bg-emerald-500 text-white"
                    : index === stepIndex
                      ? "bg-navy text-white"
                      : "bg-slate-100 text-slate-400",
                )}
              >
                {index < stepIndex ? <Check size={14} /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    index < stepIndex ? "bg-emerald-400" : "bg-slate-200",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {currentStep === "date" && (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-navy">
                  <CalendarDays size={15} />
                  Mock date
                </label>
                <Input
                  type="date"
                  min={todayIso()}
                  value={mockDate}
                  onChange={(e) => setMockDate(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted">{dateStepHint(product)}</p>
              </div>
              {showExamStartTime && (
                <ExamStartTimePicker
                  mockDate={mockDate}
                  mockTime={mockTime}
                  onMockTimeChange={setMockTime}
                />
              )}
            </div>
          )}

          {currentStep === "writing" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Choose the examiner who will grade your Writing submission.
              </p>
              {teachersLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : writingTeachers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                  No Writing examiners are available right now.
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Writing examiner
                  </label>
                  <Select
                    value={writingTeacherId ?? ""}
                    onChange={(event) =>
                      setWritingTeacherId(event.target.value || null)
                    }
                  >
                    <option value="">Select a Writing examiner…</option>
                    {writingTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                        {teacher.rating != null
                          ? ` · ${teacher.rating.toFixed(1)}★`
                          : ""}
                      </option>
                    ))}
                  </Select>
                  {selectedWritingTeacher ? (
                    <p className="text-xs text-muted">
                      {selectedWritingTeacher.name} will grade your Writing
                      tasks. You can change this before continuing.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {currentStep === "speakingExaminer" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Choose your Speaking examiner for{" "}
                <span className="font-semibold text-foreground">
                  {new Date(`${mockDate}T00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                . You&apos;ll pick a time slot next.
              </p>
              {teachersLoading && speakingTeachers.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : speakingTeachers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                  No Speaking examiners are available right now.
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Speaking examiner
                  </label>
                  <Select
                    value={speakingTeacherId ?? ""}
                    onChange={(event) => {
                      setSpeakingTeacherId(event.target.value || null);
                      setSelectedSlot(null);
                    }}
                  >
                    <option value="">Select a Speaking examiner…</option>
                    {speakingTeachers.map((teacher) => {
                      const availableSlots =
                        slotCountByTeacher.get(teacher.id) ?? 0;
                      const disabled = !slotsLoading && availableSlots === 0;
                      return (
                        <option
                          key={teacher.id}
                          value={teacher.id}
                          disabled={disabled}
                        >
                          {teacher.name}
                          {slotsLoading
                            ? " · checking availability…"
                            : availableSlots > 0
                              ? ` · ${availableSlots} open slot${availableSlots === 1 ? "" : "s"}`
                              : " · no slots on this date"}
                          {teacher.rating != null
                            ? ` · ${teacher.rating.toFixed(1)}★`
                            : ""}
                        </option>
                      );
                    })}
                  </Select>
                  {selectedSpeakingTeacher ? (
                    <p className="text-xs text-muted">
                      {selectedSpeakingTeacher.name} is pre-selected. Change
                      the dropdown if you prefer someone else.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {currentStep === "speakingSlot" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Pick a time with{" "}
                <span className="font-semibold text-foreground">
                  {selectedSpeakingTeacher?.name ?? "your examiner"}
                </span>{" "}
                on{" "}
                <span className="font-semibold text-foreground">
                  {new Date(`${mockDate}T00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                .
              </p>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <SpeakingSlotPicker
                  slots={slots}
                  selectedSlot={selectedSlot}
                  onSelect={setSelectedSlot}
                  emptyMessage="No open :00 / :20 / :40 slots for this examiner on this date. Go back and pick another examiner or change the date."
                />
              )}
            </div>
          )}

          {currentStep === "payment" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-slate-50 p-4">
                <p className="text-sm font-semibold text-navy">Order summary</p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Package</dt>
                    <dd className="font-medium text-foreground">
                      {product.title}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Mock date</dt>
                    <dd className="font-medium text-foreground">
                      {new Date(`${mockDate}T00:00`).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                      {showExamStartTime ? ` · ${mockTime}` : ""}
                    </dd>
                  </div>
                  {product.needsWriting && (
                    <div className="flex justify-between">
                      <dt className="text-muted">Writing examiner</dt>
                      <dd className="font-medium text-foreground">
                        {selectedWritingTeacher?.name ?? "—"}
                      </dd>
                    </div>
                  )}
                  {product.needsSpeaking && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-muted">Speaking examiner</dt>
                        <dd className="font-medium text-foreground">
                          {selectedSpeakingTeacher?.name ?? "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Speaking time</dt>
                        <dd className="font-medium text-foreground">
                          {selectedSlot
                            ? formatSpeakingWallTime(selectedSlot.startsAt)
                            : "—"}
                        </dd>
                      </div>
                    </>
                  )}
                  <div className="mt-2 flex justify-between border-t border-border pt-2">
                    <dt className="font-semibold text-navy">Total</dt>
                    <dd className="font-bold text-navy">{priceLabel}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <CreditCard size={15} />
                  {paymentsEnabled ? "Secure checkout" : "Confirm booking"}
                </div>
                {paymentsEnabled ? (
                  <>
                    <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                      <p className="font-medium">Pay with card via Uzum Checkout</p>
                      <p className="mt-1 text-muted">
                        Uzcard, Humo, Visa, and Mastercard are accepted. Your speaking
                        slot is held for 15 minutes while you complete checkout.
                      </p>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <Lock size={12} />
                      Encrypted checkout · International cards supported
                    </p>
                  </>
                ) : (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                    <p className="font-medium">Demo booking — no card required</p>
                    <p className="mt-1 text-amber-900/80">
                      Online payments are not enabled in this environment. Confirming
                      creates the enrollment without charging a card. Production uses
                      Uzum Checkout when payments are configured.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Button
            variant="secondary"
            onClick={stepIndex === 0 ? onClose : goBack}
            disabled={submitting}
          >
            {stepIndex === 0 ? "Cancel" : "Back"}
          </Button>
          {!isLastStep ? (
            <Button variant="danger" onClick={goNext} disabled={!canContinue}>
              Continue
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={handleConfirm}
              disabled={!canContinue}
              loading={submitting}
            >
              {submitting
                ? "Processing…"
                : paymentsEnabled && isLastStep
                  ? `Continue to payment · ${priceLabel}`
                  : isLastStep
                    ? `Confirm booking · ${priceLabel}`
                    : "Continue"}
            </Button>
          )}
        </div>

        {redirectingToCheckout ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/95 px-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-navy" />
            <p className="text-sm font-semibold text-navy">
              Redirecting to secure checkout…
            </p>
            <p className="text-xs text-muted">
              Please wait — do not close this window.
            </p>
          </div>
        ) : null}
    </Modal>
  );
}
