"use client";

import { TypeTabBar } from "@/components/shared/type-tab-bar";

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
  return (
    <TypeTabBar
      tabs={tabs.map((tab) => ({
        id: tab.tabId,
        label: tab.label,
        muted: !tab.available,
      }))}
      activeId={activeTabId}
      onChange={onTabChange}
    />
  );
}
