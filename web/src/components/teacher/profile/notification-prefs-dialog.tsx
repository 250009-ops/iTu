"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateTeacherProfile } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";

const PREFS = [
  {
    id: "newSubmission",
    label: "New writing submissions",
    description: "Email me when a writing task is assigned for grading.",
  },
  {
    id: "speakingReminder",
    label: "Speaking session reminders",
    description: "Remind me 30 minutes before a scheduled speaking session.",
  },
  {
    id: "payout",
    label: "Payout updates",
    description: "Notify me when a payout is processed to my account.",
  },
  {
    id: "slaWarning",
    label: "SLA deadline warnings",
    description: "Alert me when a grading deadline is approaching.",
  },
] as const;

type PrefId = (typeof PREFS)[number]["id"];

const DEFAULT_PREFS: Record<PrefId, boolean> = {
  newSubmission: true,
  speakingReminder: true,
  payout: true,
  slaWarning: true,
};

export function NotificationPrefsDialog({
  initialPrefs,
  onClose,
  onDone,
}: {
  initialPrefs: Record<string, boolean> | null;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Record<PrefId, boolean>>({
    ...DEFAULT_PREFS,
    ...(initialPrefs ?? {}),
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    try {
      await updateTeacherProfile({ notificationPrefs: prefs });
      await onDone();
      toast("Preferences saved", {
        description: "Your notification settings have been updated.",
        variant: "success",
      });
      onClose();
    } catch (err) {
      toast("Could not save preferences", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy">
              Notification preferences
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Choose which session and grading alerts you receive.
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

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {PREFS.map((pref) => (
            <div
              key={pref.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-navy">{pref.label}</p>
                <p className="mt-0.5 text-xs text-muted">{pref.description}</p>
              </div>
              <Switch
                checked={prefs[pref.id]}
                onChange={(checked) =>
                  setPrefs((prev) => ({ ...prev, [pref.id]: checked }))
                }
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={submitting}>
            Save preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
