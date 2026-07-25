"use client";

import { useState } from "react";
import { Loader2, MessageSquareHeart, Star, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  skipMockFeedback,
  submitMockFeedback,
  type PendingMockFeedback,
} from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type MockFeedbackModalProps = {
  pending: PendingMockFeedback;
  onDone: () => void;
};

export function MockFeedbackModal({ pending, onDone }: MockFeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  async function handleSubmit() {
    if (rating < 1) {
      setError("Please choose a star rating");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await submitMockFeedback({
        enrollmentId: pending.enrollmentId,
        rating,
        comment: comment.trim() || undefined,
        wouldRecommend: wouldRecommend ?? undefined,
      });
      setThanks(true);
      window.setTimeout(onDone, 1200);
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit feedback"));
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    setError(null);
    try {
      await skipMockFeedback(pending.enrollmentId);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, "Could not dismiss feedback"));
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!saving && !thanks) void handleSkip();
      }}
      ariaLabel="How was your mock?"
      className="max-w-md"
    >
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <MessageSquareHeart size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy">How was your mock?</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {pending.packageTitle}
              <span className="text-slate-300"> · </span>
              {pending.enrollmentCode}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSkip()}
          disabled={saving || thanks}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {thanks ? (
        <div className="px-5 py-10 text-center">
          <p className="text-base font-semibold text-navy">Thank you</p>
          <p className="mt-1 text-sm text-slate-500">
            Your feedback helps us improve iTestU.
          </p>
        </div>
      ) : (
        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Overall rating <span className="text-rose-500">*</span>
            </p>
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const value = i + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={saving}
                    onMouseEnter={() => setHover(value)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(value)}
                    aria-label={`${value} star${value > 1 ? "s" : ""}`}
                    className="rounded-md p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        value <= (hover || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-slate-100 text-slate-200",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700">
              Would you recommend iTestU?
            </p>
            <div className="mt-2 flex gap-2">
              {(
                [
                  { label: "Yes", value: true },
                  { label: "No", value: false },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setWouldRecommend((prev) =>
                      prev === opt.value ? null : opt.value,
                    )
                  }
                  className={cn(
                    "h-9 flex-1 rounded-lg border text-sm font-semibold transition-colors",
                    wouldRecommend === opt.value
                      ? "border-navy bg-navy text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="mock-feedback-comment"
              className="text-sm font-medium text-slate-700"
            >
              Anything we should know?{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="mock-feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={saving}
              placeholder="What went well? What could be better?"
              rows={3}
              maxLength={1000}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-navy focus:ring-1 focus:ring-navy disabled:opacity-60"
            />
          </div>

          {error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving || rating < 1}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit feedback
            </button>
            <button
              type="button"
              onClick={() => void handleSkip()}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
