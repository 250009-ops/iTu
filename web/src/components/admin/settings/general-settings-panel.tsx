"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { defaultExamPolicies } from "@/lib/admin/constants";
import { useAdminSettings } from "@/contexts/admin-settings-context";

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

function PolicyRow({
  label,
  hint,
  defaultOn,
}: {
  label: string;
  hint: string;
  defaultOn: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0">
      <div>
        <p className="font-semibold text-navy">{label}</p>
        <p className="mt-0.5 text-sm text-muted">{hint}</p>
      </div>
      <Switch defaultChecked={defaultOn} aria-label={label} />
    </div>
  );
}

export function GeneralSettingsPanel() {
  const { generalSettings, setField } = useAdminSettings();

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">General Settings</h2>
        <p className="mt-0.5 text-sm text-muted">
          Platform identity, policies, and student-facing configuration.
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
            <Select defaultValue="utc0">
              <option value="utc0">{generalSettings.timezone}</option>
              <option value="utc5">UTC+5 (Islamabad)</option>
              <option value="utc8">UTC+8 (Singapore)</option>
            </Select>
          </Field>
        </div>

        <Field label="Default Language" hint="Default locale for student-facing content">
          <Select defaultValue="en-gb">
            <option value="en-gb">{generalSettings.defaultLanguage}</option>
            <option value="en-us">English (en-US)</option>
          </Select>
        </Field>
      </div>

      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Exam Policies
        </p>
        <div className="mt-2">
          {defaultExamPolicies.map((policy) => (
            <PolicyRow
              key={policy.id}
              label={policy.label}
              hint={policy.hint}
              defaultOn={policy.defaultOn}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Maintenance
        </p>
        <div className="mt-2 flex items-center justify-between gap-4 rounded-xl border border-border bg-slate-50 px-4 py-4">
          <div>
            <p className="font-semibold text-navy">Maintenance Mode</p>
            <p className="mt-0.5 text-sm text-muted">
              Students see a scheduled downtime message; no new bookings accepted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-muted">Off</span>
            <Switch defaultChecked={false} aria-label="Maintenance Mode" />
          </div>
        </div>
      </div>
    </div>
  );
}
