"use client";

import { useState } from "react";
import { Clock, CreditCard, ExternalLink } from "lucide-react";
import { useTeacherEarnings } from "@/contexts/teacher-earnings-context";
import { useToast } from "@/components/ui/toast";
import { updateTeacherProfile } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";
import { formatPrice } from "@/lib/format-price";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Lightweight Luhn check (same rule as API). */
function isLuhnValid(digits: string) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function formatCardDisplay(digits: string) {
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function NextPayoutCard() {
  const { toast } = useToast();
  const { earnings, refresh } = useTeacherEarnings();
  const nextPayout = earnings.nextPayout;
  const saved = earnings.payoutDetails;
  const currency = earnings.summary.currency;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [method, setMethod] = useState("Bank card");

  function openForm() {
    setCardHolderName(saved?.cardHolderName ?? "");
    setCardNumber(saved?.cardNumber ?? "");
    setMethod(saved?.method ?? "Bank card");
    setOpen(true);
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    const holder = cardHolderName.trim();
    const number = digitsOnly(cardNumber);
    if (!holder || !isLuhnValid(number)) {
      toast("Complete all card fields", {
        description:
          "Card holder name and a valid 13–19 digit card number are required.",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      await updateTeacherProfile({
        payoutDetails: {
          cardHolderName: holder,
          cardNumber: number,
          method: method.trim() || "Bank card",
        },
      });
      await refresh();
      setOpen(false);
      toast("Payout details saved", { variant: "success" });
    } catch (err) {
      toast("Could not save details", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <CreditCard className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-semibold text-navy">Current earnings period</h2>
            <p className="mt-0.5 text-sm text-muted">
              {nextPayout.date} · {nextPayout.bank} · {nextPayout.method}
            </p>
            {nextPayout.lockedAmount > 0 && nextPayout.unlockDate && (
              <p className="mt-1 text-xs text-muted">
                {formatPrice(nextPayout.lockedAmount, currency)} earned this period — available to
                request on {nextPayout.unlockDate}
              </p>
            )}
            {nextPayout.processingAmount > 0 && (
              <p className="mt-1 text-xs text-sky-700">
                {formatPrice(nextPayout.processingAmount, currency)} already requested and processing
              </p>
            )}
            {!nextPayout.hasBankDetails && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Add card details before requesting a payout.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="text-right">
            <p className="text-xs text-muted">
              {nextPayout.projectedAmount > 0 ? "Available to request" : "Available amount"}
            </p>
            <p className="text-2xl font-bold text-navy">
              {formatPrice(nextPayout.projectedAmount, currency)}
            </p>
          </div>
          {nextPayout.lockedAmount > 0 && nextPayout.daysRemaining > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              Unlocks in {nextPayout.daysRemaining} days
            </span>
          )}
          <button
            type="button"
            onClick={openForm}
            className="flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Manage card
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(e) => void saveDetails(e)}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-navy">Payout card details</h3>
            <p className="mt-1 text-sm text-muted">
              Used for manual card transfers after you request a payout. Your
              card number is shown masked here after saving.
            </p>
            <div className="mt-5 space-y-3">
              <input
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
                placeholder="Card holder name"
                autoComplete="cc-name"
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
              <input
                value={formatCardDisplay(cardNumber)}
                onChange={(e) =>
                  setCardNumber(digitsOnly(e.target.value).slice(0, 19))
                }
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="Card number"
                className="h-10 w-full rounded-lg border border-border px-3 text-sm tracking-wide"
              />
              {cardNumber.length >= 4 && (
                <p className="text-xs text-muted">
                  Displayed as Card ···{cardNumber.slice(-4)} on your earnings
                  page.
                </p>
              )}
              <input
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="Payout method"
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save details"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
