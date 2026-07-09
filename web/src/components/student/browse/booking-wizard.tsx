"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format-price";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  CreditCard,
  Loader2,
  Lock,
  Mic,
  PenLine,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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

type WizardStepId = "date" | "writing" | "speaking" | "payment";

const STEP_LABELS: Record<WizardStepId, string> = {
  date: "Date & time",
  writing: "Writing examiner",
  speaking: "Speaking slot",
  payment: "Payment",
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

function buildWizardSteps(product: BrowseProduct): WizardStepId[] {
  const steps: WizardStepId[] = ["date"];
  if (product.needsWriting) steps.push("writing");
  if (product.needsSpeaking) steps.push("speaking");
  steps.push("payment");
  return steps;
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
}: {
  product: BrowseProduct;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const steps = useMemo(() => buildWizardSteps(product), [product]);

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex]!;

  const [mockDate, setMockDate] = useState(todayIso());
  const [mockTime, setMockTime] = useState(EXAM_START_TIMES[0]);

  const [writingTeachers, setWritingTeachers] = useState<Teacher[]>([]);
  const [writingTeacherId, setWritingTeacherId] = useState<string | null>(null);
  const [teachersLoading, setTeachersLoading] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const [submitting, setSubmitting] = useState(false);
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

  const loadTeachers = useCallback(async () => {
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

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const list = await getAvailability(mockDate);
      setSlots(list);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load speaking slots"));
    } finally {
      setSlotsLoading(false);
    }
  }, [mockDate]);

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
      void loadTeachers();
    }
    if (currentStep === "speaking") {
      void loadSlots();
    }
  }, [currentStep, writingTeachers.length, loadTeachers, loadSlots]);

  const slotsByTeacher = useMemo(() => {
    const groups = new Map<string, { name: string; slots: Slot[] }>();
    for (const slot of slots) {
      const entry = groups.get(slot.teacherId) ?? {
        name: slot.teacherName,
        slots: [],
      };
      entry.slots.push(slot);
      groups.set(slot.teacherId, entry);
    }
    return [...groups.values()];
  }, [slots]);

  const canContinue = useMemo(() => {
    if (purchaseBlocked) return false;
    if (currentStep === "date") return Boolean(mockDate && mockTime);
    if (currentStep === "writing") return Boolean(writingTeacherId);
    if (currentStep === "speaking") return Boolean(selectedSlot);
    if (currentStep === "payment") {
      if (paymentsEnabled) return true;
      return Boolean(cardName && cardNumber && cardExpiry && cardCvc);
    }
    return false;
  }, [
    currentStep,
    mockDate,
    mockTime,
    writingTeacherId,
    selectedSlot,
    cardName,
    cardNumber,
    cardExpiry,
    cardCvc,
    purchaseBlocked,
    paymentsEnabled,
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
    if (product.needsSpeaking && !selectedSlot) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await createBooking({
        packageId: product.id,
        mockDate: new Date(`${mockDate}T${mockTime}:00`).toISOString(),
        mockTime,
        ...(product.needsWriting && writingTeacherId
          ? { writingTeacherId }
          : {}),
        ...(product.needsSpeaking && selectedSlot
          ? {
              speakingTeacherId: selectedSlot.teacherId,
              speakingSlotId: selectedSlot.id,
            }
          : {}),
        paymentMethod: "card",
      });

      if (result.status === "pending_payment" && result.checkoutUrl) {
        toast("Redirecting to secure checkout", {
          description: "Complete payment to confirm your mock.",
          variant: "success",
        });
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
      setSubmitting(false);
    }
  }

  const isLastStep = stepIndex === steps.length - 1;

  return (
    <Modal open onClose={onClose} ariaLabel={`Book ${product.title}`}>
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
                <p className="mt-1 text-xs text-muted">
                  Check-in opens 15 minutes before your start time.
                </p>
              </div>
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
                <div className="space-y-2">
                  {writingTeachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => setWritingTeacherId(teacher.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors",
                        writingTeacherId === teacher.id
                          ? "border-navy bg-navy/5"
                          : "border-border bg-white hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                          <PenLine size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {teacher.name}
                          </p>
                          <p className="text-xs text-muted">
                            Writing examiner · IELTS certified
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {teacher.rating != null && (
                          <span className="flex items-center gap-1 text-sm text-amber-500">
                            <Star size={14} className="fill-current" />
                            {teacher.rating.toFixed(1)}
                          </span>
                        )}
                        {writingTeacherId === teacher.id && (
                          <Check size={18} className="text-navy" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === "speaking" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Pick an available Speaking slot for{" "}
                <span className="font-semibold text-foreground">
                  {new Date(`${mockDate}T00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                . The slot also assigns your Speaking examiner.
              </p>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : slotsByTeacher.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                  No Speaking slots available on this date. Try another date in
                  step 1.
                </div>
              ) : (
                <div className="space-y-4">
                  {slotsByTeacher.map((group) => (
                    <div key={group.name}>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                          <Mic size={15} />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {group.name}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.slots.map((slot) => (
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
                  ))}
                </div>
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
                      )}{" "}
                      · {mockTime}
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
                    <div className="flex justify-between">
                      <dt className="text-muted">Speaking slot</dt>
                      <dd className="font-medium text-foreground">
                        {selectedSlot
                          ? `${formatSlotTime(selectedSlot.startsAt)} · ${selectedSlot.teacherName}`
                          : "—"}
                      </dd>
                    </div>
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
                  {paymentsEnabled ? "Secure checkout" : "Card details"}
                </div>
                {paymentsEnabled ? (
                  <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                    <p className="font-medium">Pay with card via Lemon Squeezy</p>
                    <p className="mt-1 text-muted">
                      Visa, Mastercard, and international cards (including Uzum
                      Bank Visa) are accepted. Your speaking slot is held for 15
                      minutes while you complete checkout.
                    </p>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Name on card"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                    <Input
                      placeholder="Card number"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="MM / YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                      <Input
                        placeholder="CVC"
                        inputMode="numeric"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                      />
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <Lock size={12} />
                      Demo checkout — no real card is charged until Lemon
                      Squeezy is configured.
                    </p>
                  </>
                )}
                {paymentsEnabled && (
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Lock size={12} />
                    Encrypted checkout · International cards supported
                  </p>
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
    </Modal>
  );
}
