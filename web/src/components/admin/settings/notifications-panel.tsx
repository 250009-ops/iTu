"use client";

import { AlertTriangle, Bell, GraduationCap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { defaultNotificationGroups } from "@/lib/admin/constants";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { cn } from "@/lib/utils";

const groupIcons = {
  sky: GraduationCap,
  emerald: Bell,
  rose: AlertTriangle,
};

const groupHeaderStyles = {
  sky: "text-sky-600",
  emerald: "text-emerald-600",
  rose: "text-rose-600",
};

export function NotificationsPanel() {
  const { notifications, setField } = useAdminSettings();
  const prefs = notifications as Record<string, boolean>;

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Notification Settings</h2>
        <p className="mt-0.5 text-sm text-muted">
          Control which automated emails and in-app alerts fire for each event.
          Save changes from the footer when done.
        </p>
      </div>

      <div className="mt-6 space-y-8">
        {defaultNotificationGroups.map((group) => {
          const Icon = groupIcons[group.tone];
          return (
            <section key={group.id}>
              <div
                className={cn(
                  "flex items-center gap-2 text-xs font-bold uppercase tracking-wide",
                  groupHeaderStyles[group.tone],
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {group.label}
              </div>
              <div className="mt-3 divide-y divide-border rounded-xl border border-border">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-navy">{item.label}</p>
                      <p className="mt-0.5 text-sm text-muted">{item.hint}</p>
                    </div>
                    <Switch
                      checked={prefs[item.id] ?? item.defaultOn}
                      onChange={(v) => setField("notifications", item.id, v)}
                      aria-label={item.label}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
