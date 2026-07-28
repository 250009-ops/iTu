import {
  Bell,
  Clock,
  KeyRound,
  Layers,
  Percent,
  Settings2,
  ShieldAlert,
  Table2,
} from "lucide-react";
import { settingsTabs } from "@/lib/admin/constants";
import type { SettingsTab } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const tabIcons: Record<SettingsTab, typeof Settings2> = {
  general: Settings2,
  exam_timers: Clock,
  exam_integrity: ShieldAlert,
  commission: Percent,
  band_table: Table2,
  notifications: Bell,
  integrations: Layers,
  account: KeyRound,
};

type SettingsNavProps = {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
};

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <nav className="space-y-1">
      {settingsTabs.map((tab) => {
        const Icon = tabIcons[tab.id];
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
              isActive
                ? "bg-navy text-white shadow-sm"
                : "text-navy hover:bg-slate-100",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                isActive ? "text-white" : "text-muted",
              )}
              strokeWidth={1.75}
            />
            <div>
              <p className="text-sm font-semibold">{tab.label}</p>
              <p
                className={cn(
                  "text-xs",
                  isActive ? "text-white/70" : "text-muted",
                )}
              >
                {tab.description}
              </p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
