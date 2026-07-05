"use client";

import { useState } from "react";
import { Clock, CreditCard, ExternalLink } from "lucide-react";
import { useTeacherEarnings } from "@/contexts/teacher-earnings-context";
import { useToast } from "@/components/ui/toast";
import { updateTeacherProfile } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";

export function NextPayoutCard() {
  const { toast } = useToast();
  const { earnings, refresh } = useTeacherEarnings();
  const nextPayout = earnings.nextPayout;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountLast4, setAccountLast4] = useState("");
  const [method, setMethod] = useState("Bank transfer");

  function openForm() {
    setOpen(true);
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!bankName.trim() || !accountName.trim() || accountLast4.trim().length !== 4) {
      toast("Complete all bank fields", {
        description: "Bank name, account holder, and last 4 digits are required.",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      await updateTeacherProfile({
        payoutDetails: {
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountLast4: accountLast4.trim(),
          method: method.trim() || "Bank transfer",
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
            <h2 className="font-semibold text-navy">Next Scheduled Payout</h2>
            <p className="mt-0.5 text-sm text-muted">
              {nextPayout.date} · {nextPayout.bank} · {nextPayout.method}
            </p>
            {!nextPayout.hasBankDetails && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Add bank details before requesting a payout.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="text-right">
            <p className="text-xs text-muted">Projected amount</p>
            <p className="text-2xl font-bold text-navy">
              $
              {nextPayout.projectedAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          {nextPayout.daysRemaining > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              {nextPayout.daysRemaining} days remaining
            </span>
          )}
          <button
            type="button"
            onClick={openForm}
            className="flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Manage
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
            <h3 className="text-lg font-bold text-navy">Payout bank details</h3>
            <p className="mt-1 text-sm text-muted">
              Used for manual bank transfers after you request a payout.
            </p>
            <div className="mt-5 space-y-3">
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bank name"
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Account holder name"
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
              <input
                value={accountLast4}
                onChange={(e) =>
                  setAccountLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                inputMode="numeric"
                placeholder="Last 4 digits"
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
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
