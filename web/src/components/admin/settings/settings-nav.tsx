import {
  Activity,
  Bell,
  Clock,
  Layers,
  Percent,
  Settings2,
  Table2,
} from "lucide-react";
import { settingsTabs, systemHealth } from "@/lib/admin/constants";
import type { SettingsTab } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const tabIcons: Record<SettingsTab, typeof Settings2> = {
  general: Settings2,
  exam_timers: Clock,
  commission: Percent,
  band_table: Table2,
  notifications: Bell,
  integrations: Layers,
};

const statusStyles = {
  operational: "text-emerald-600",
  degraded: "text-amber-600",
  disconnected: "text-slate-400",
};

type SettingsNavProps = {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
};

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <div className="space-y-4">
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

      <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky-600" strokeWidth={1.75} />
          <p className="text-sm font-semibold text-navy">System Health</p>
        </div>
        <ul className="mt-3 space-y-2">
          {systemHealth.map((item) => (
            <li
              key={item.service}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted">{item.service}</span>
              <span
                className={cn(
                  "font-semibold capitalize",
                  statusStyles[item.status],
                )}
              >
                {item.status === "operational" ? "Operational" : "Degraded"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
