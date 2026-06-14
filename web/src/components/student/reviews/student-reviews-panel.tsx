"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Trophy, MessageSquare, Check, Loader2 } from "lucide-react";
import {
  getReviewables,
  getStudentProfile,
  setLeaderboardConsent,
  submitReview,
  type ReviewableMock,
} from "@/lib/api/students";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function StudentReviewsPanel() {
  const [reviewables, setReviewables] = useState<ReviewableMock[]>([]);
  const [consent, setConsent] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [mocks, profile] = await Promise.all([
        getReviewables(),
        getStudentProfile(),
      ]);
      setReviewables(mocks);
      setConsent(profile.publishToLeaderboard);
    } catch {
      setReviewables([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConsent = async (next: boolean) => {
    setConsent(next);
    setConsentSaving(true);
    try {
      await setLeaderboardConsent(next);
    } catch {
      setConsent(!next);
    } finally {
      setConsentSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 text-gray-400 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Trophy size={18} className="mt-0.5 text-amber-500" />
            <div>
              <h3 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
                Show me on the public leaderboard
              </h3>
              <p className="mt-1 text-gray-500" style={{ fontSize: "13px" }}>
                Display your name, country, and best band on the public Band Heroes
                leaderboard. You can turn this off anytime.
              </p>
            </div>
          </div>
          <Switch
            checked={consent}
            onChange={handleConsent}
            disabled={consentSaving}
            aria-label="Publish to leaderboard"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare size={16} className="text-navy" />
          <h3 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
            Rate your mocks
          </h3>
        </div>

        {reviewables.length === 0 ? (
          <p className="text-gray-500" style={{ fontSize: "13px" }}>
            Once you complete a mock, you can leave a review for your examiner here.
          </p>
        ) : (
          <div className="space-y-3">
            {reviewables.map((mock) => (
              <ReviewRow key={mock.enrollmentId} mock={mock} onSubmitted={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRow({
  mock,
  onSubmitted,
}: {
  mock: ReviewableMock;
  onSubmitted: () => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const examiner = mock.speakingExaminer ?? mock.writingExaminer;

  if (mock.review) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900" style={{ fontSize: "13px" }}>
            {mock.package}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700" style={{ fontSize: "12px" }}>
            <Check className="h-3 w-3" /> Reviewed
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-3.5 w-3.5",
                i < mock.review!.rating
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200",
              )}
            />
          ))}
        </div>
        {mock.review.comment ? (
          <p className="mt-2 text-gray-600" style={{ fontSize: "13px" }}>
            &ldquo;{mock.review.comment}&rdquo;
          </p>
        ) : null}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please select a rating");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await submitReview({
        enrollmentId: mock.enrollmentId,
        rating,
        comment: comment.trim() || undefined,
        publishConsent: publish,
      });
      await onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit review");
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-900" style={{ fontSize: "13px" }}>
          {mock.package}
        </p>
        {examiner ? (
          <span className="text-gray-500" style={{ fontSize: "12px" }}>
            Examiner: {examiner}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const value = i + 1;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(value)}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  value <= (hover || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-slate-200 text-slate-200",
                )}
              />
            </button>
          );
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share how your examiner's feedback helped (optional)"
        rows={2}
        maxLength={1000}
        className="mt-3 w-full resize-none rounded-lg border border-gray-200 p-2.5 text-gray-900 outline-none focus:border-navy focus:ring-1 focus:ring-navy"
        style={{ fontSize: "13px" }}
      />

      <label className="mt-2 flex cursor-pointer items-center gap-2 text-gray-600" style={{ fontSize: "12px" }}>
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 accent-navy"
        />
        Allow this review to appear publicly as a testimonial
      </label>

      {error ? (
        <p className="mt-2 text-rose-600" style={{ fontSize: "12px" }}>
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-navy px-4 font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
        style={{ fontSize: "13px" }}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Submit review
      </button>
    </div>
  );
}
