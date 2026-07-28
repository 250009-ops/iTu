"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateTeacherProfile } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const SPECIALITIES = [
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
  { value: "both", label: "Both" },
] as const;

type Speciality = (typeof SPECIALITIES)[number]["value"];

export function EditProfileDialog({
  initialName,
  initialBio,
  initialSpeciality,
  lockSpeciality = false,
  onClose,
  onDone,
}: {
  initialName: string;
  initialBio: string | null;
  initialSpeciality: string;
  lockSpeciality?: boolean;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [speciality, setSpeciality] = useState<Speciality>(
    (["writing", "speaking", "both"].includes(initialSpeciality)
      ? initialSpeciality
      : "both") as Speciality,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateTeacherProfile({
        name: name.trim(),
        bio: bio.trim(),
        ...(lockSpeciality ? {} : { speciality }),
      });
      toast("Profile updated", {
        description: "Your examiner profile has been saved.",
        variant: "success",
      });
      await onDone();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save profile."));
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
            <h2 className="text-lg font-bold text-navy">Edit profile</h2>
            <p className="mt-0.5 text-sm text-muted">
              Update your display name, bio and examiner specialisation.
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
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Full name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Specialisation
            </label>
            {lockSpeciality ? (
              <p className="rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                {SPECIALITIES.find((s) => s.value === speciality)?.label ??
                  speciality}
                <span className="mt-1 block text-xs text-muted">
                  Assigned by your centre. Contact them to change this.
                </span>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {SPECIALITIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSpeciality(s.value)}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm font-semibold",
                      speciality === s.value
                        ? "border-navy bg-navy text-white"
                        : "border-border bg-white text-foreground hover:bg-slate-50",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder={
                lockSpeciality
                  ? "Brief note for your centre about your IELTS examining focus…"
                  : "Tell students about your IELTS examiner experience…"
              }
              className="w-full resize-none rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

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
          <Button variant="primary" onClick={handleSave} loading={submitting}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
