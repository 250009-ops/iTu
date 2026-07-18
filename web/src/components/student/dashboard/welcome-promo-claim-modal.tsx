"use client";

import { useState } from "react";
import { CalendarDays, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import {
  claimWelcomePromo,
  type StudentDashboardResponse,
} from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";

type WelcomePromo = StudentDashboardResponse["welcomePromos"][number];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function WelcomePromoClaimModal({
  promo,
  onClose,
}: {
  promo: WelcomePromo;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { refresh } = useStudentDashboardData();
  const [mockDate, setMockDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await claimWelcomePromo({
        skill: promo.skill,
        mockDate,
      });
      await refresh();
      toast("Welcome gift claimed", {
        description: `Your free ${promo.skill} mock is booked. Head to Mock Day when you're ready.`,
        variant: "success",
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not claim this offer"));
    } finally {
      setSubmitting(false);
    }
  }

  const skillLabel = promo.skill === "listening" ? "Listening" : "Reading";

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={`Claim free ${skillLabel} mock`}
      className="max-w-md"
    >
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Welcome gift
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy">
            Claim free {skillLabel} mock
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5">
        <p className="text-sm text-muted">
          Pick your mock day. You can start anytime before the day cutoff on
          that date — no payment required.
        </p>

        <div className="space-y-2">
          <label
            htmlFor="welcome-promo-mock-date"
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <CalendarDays className="h-4 w-4 text-muted" />
            Mock date
          </label>
          <Input
            id="welcome-promo-mock-date"
            type="date"
            min={todayIso()}
            value={mockDate}
            onChange={(event) => setMockDate(event.target.value)}
            disabled={submitting}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => void handleSubmit()}
          disabled={submitting || !mockDate}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Claiming…
            </>
          ) : (
            "Claim free mock"
          )}
        </Button>
      </div>
    </Modal>
  );
}
