"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Laptop,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { changePassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";
import { useStudentProfileData } from "@/contexts/student-profile-context";

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="font-semibold text-navy" style={{ fontSize: "15px" }}>
            {title}
          </h3>
          <p className="text-gray-500" style={{ fontSize: "13px" }}>
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function currentDeviceLabel() {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return `${browser} · ${os}`;
}

export function ProfileSecurityTab() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !next || !confirm) {
      toast("Fill in all password fields", { variant: "warning" });
      return;
    }
    if (next !== confirm) {
      toast("Passwords don't match", { variant: "warning" });
      return;
    }
    if (next.length < 6) {
      toast("Password too short", {
        description: "Use at least 6 characters.",
        variant: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast("Password updated", {
        description: "Your password was changed successfully.",
        variant: "success",
      });
    } catch (err) {
      toast("Could not update password", {
        description: getErrorMessage(err, "Check your current password."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm placeholder:text-gray-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10";

  const deviceLabel = useMemo(() => currentDeviceLabel(), []);

  return (
    <div className="space-y-6">
      <SectionCard
        icon={Lock}
        title="Change password"
        description="Use a strong password you don't reuse elsewhere."
      >
        <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-3">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            className={inputClass}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="New password"
              className={inputClass}
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        icon={ShieldCheck}
        title="Two-factor authentication"
        description="Add an extra layer of security at sign-in."
      >
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Two-factor authentication is not enabled for this environment yet.
          Your account is protected by your password and session token.
        </div>
      </SectionCard>

      <SectionCard
        icon={Laptop}
        title="Current session"
        description="The device you are signed in on right now."
      >
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <Laptop className="h-4 w-4 text-gray-500" />
          <div>
            <p className="font-medium text-navy" style={{ fontSize: "14px" }}>
              {deviceLabel}
            </p>
            <p className="text-gray-500" style={{ fontSize: "12px" }}>
              This device · active now
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

const NOTIFICATION_PREF_DEFS = [
  {
    id: "results",
    title: "Results released",
    detail: "Get notified the moment your band scores are available.",
    defaultEmail: true,
    defaultPush: true,
  },
  {
    id: "mock-reminders",
    title: "Mock day reminders",
    detail: "Reminders before check-in and each section.",
    defaultEmail: true,
    defaultPush: true,
  },
  {
    id: "grading",
    title: "Grading updates",
    detail: "When an examiner grades your Writing or Speaking.",
    defaultEmail: true,
    defaultPush: false,
  },
  {
    id: "promotions",
    title: "Offers & tips",
    detail: "Occasional study tips and mock package offers.",
    defaultEmail: false,
    defaultPush: false,
  },
] as const;

type PrefRow = {
  id: string;
  email: boolean;
  push: boolean;
};

function buildDefaultPrefs(): PrefRow[] {
  return NOTIFICATION_PREF_DEFS.map((p) => ({
    id: p.id,
    email: p.defaultEmail,
    push: p.defaultPush,
  }));
}

function prefsFromApi(
  stored: Record<string, boolean> | null | undefined,
): PrefRow[] {
  return NOTIFICATION_PREF_DEFS.map((p) => ({
    id: p.id,
    email: stored?.[`${p.id}_email`] ?? p.defaultEmail,
    push: stored?.[`${p.id}_push`] ?? p.defaultPush,
  }));
}

function prefsToApi(prefs: PrefRow[]): Record<string, boolean> {
  return prefs.reduce<Record<string, boolean>>((acc, p) => {
    acc[`${p.id}_email`] = p.email;
    acc[`${p.id}_push`] = p.push;
    return acc;
  }, {});
}

export function ProfileNotificationsTab() {
  const { toast } = useToast();
  const { profile, update } = useStudentProfileData();
  const [prefs, setPrefs] = useState<PrefRow[]>(buildDefaultPrefs);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.notificationPrefs) {
      setPrefs(prefsFromApi(profile.notificationPrefs));
    }
  }, [profile?.notificationPrefs]);

  function updatePref(id: string, key: "email" | "push", value: boolean) {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    );
  }

  async function savePrefs() {
    setSaving(true);
    try {
      await update({ notificationPrefs: prefsToApi(prefs) });
      toast("Preferences saved", {
        description: "Your notification settings were updated.",
        variant: "success",
      });
    } catch (err) {
      toast("Could not save preferences", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="font-semibold text-navy" style={{ fontSize: "15px" }}>
            Notification preferences
          </h3>
          <p className="text-gray-500" style={{ fontSize: "13px" }}>
            Choose how you want to hear from us.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void savePrefs()}
          disabled={saving}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
        <span>Notification</span>
        <span className="flex items-center gap-1">
          <Mail className="h-3.5 w-3.5" /> Email
        </span>
        <span>Push</span>
      </div>

      <div className="divide-y divide-gray-100">
        {NOTIFICATION_PREF_DEFS.map((pref) => {
          const state = prefs.find((p) => p.id === pref.id)!;
          return (
            <div
              key={pref.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-4"
            >
              <div>
                <p className="font-medium text-navy" style={{ fontSize: "14px" }}>
                  {pref.title}
                </p>
                <p className="text-gray-500" style={{ fontSize: "12px" }}>
                  {pref.detail}
                </p>
              </div>
              <Switch
                checked={state.email}
                onChange={(v) => updatePref(pref.id, "email", v)}
                aria-label={`Email notifications for ${pref.title}`}
              />
              <Switch
                checked={state.push}
                onChange={(v) => updatePref(pref.id, "push", v)}
                aria-label={`Push notifications for ${pref.title}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
