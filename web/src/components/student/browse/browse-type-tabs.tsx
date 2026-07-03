"use client";

import { cn } from "@/lib/utils";

type BrowseTypeTabsProps = {
  tabs: Array<{ tabId: string; label: string; available: boolean }>;
  activeTabId: string;
  onTabChange: (tabId: string) => void;
};

export function BrowseTypeTabs({
  tabs,
  activeTabId,
  onTabChange,
}: BrowseTypeTabsProps) {
  if (tabs.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.tabId}
          type="button"
          onClick={() => onTabChange(tab.tabId)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            activeTabId === tab.tabId
              ? "bg-navy text-white shadow-sm"
              : tab.available
                ? "bg-white text-muted ring-1 ring-border hover:text-navy"
                : "bg-slate-50 text-slate-400 ring-1 ring-border hover:text-slate-500",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
