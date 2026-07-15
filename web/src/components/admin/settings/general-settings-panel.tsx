"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAdminSettings } from "@/contexts/admin-settings-context";

const TIMEZONE_OPTIONS = [
  { value: "Asia/Tashkent", label: "Asia/Tashkent (UTC+5)" },
  { value: "Asia/Karachi", label: "Asia/Karachi (UTC+5)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+8)" },
  { value: "Europe/London", label: "Europe/London (UTC+0/+1)" },
  { value: "UTC", label: "UTC" },
] as const;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

export function GeneralSettingsPanel() {
  const { generalSettings, setField } = useAdminSettings();
  const timezoneValue = TIMEZONE_OPTIONS.some((o) => o.value === generalSettings.timezone)
    ? generalSettings.timezone
    : "Asia/Tashkent";

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">General Settings</h2>
        <p className="mt-0.5 text-sm text-muted">
          Platform identity and contact details.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <Field label="Platform Name" hint="Shown in emails and the student portal header">
          <Input
            value={generalSettings.platformName}
            onChange={(e) => setField("general", "platformName", e.target.value)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Support Email" hint="All student tickets route here">
            <Input
              value={generalSettings.supportEmail}
              type="email"
              onChange={(e) => setField("general", "supportEmail", e.target.value)}
            />
          </Field>
          <Field label="Admin Contact" hint="Internal escalations">
            <Input
              value={generalSettings.adminContact}
              type="email"
              onChange={(e) => setField("general", "adminContact", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Platform URL" hint="Used in outbound email links">
            <Input
              value={generalSettings.platformUrl}
              type="url"
              onChange={(e) => setField("general", "platformUrl", e.target.value)}
            />
          </Field>
          <Field label="Timezone" hint="All exam schedules are displayed in this timezone">
            <Select
              value={timezoneValue}
              onChange={(e) => setField("general", "timezone", e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </div>
  );
}
