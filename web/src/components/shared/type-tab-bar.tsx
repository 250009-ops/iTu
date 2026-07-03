"use client";

import { cn } from "@/lib/utils";

export type TypeTabItem = {
  id: string;
  label: string;
  count?: number;
  muted?: boolean;
};

type TypeTabBarProps = {
  tabs: TypeTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  /** When true, tabs scroll horizontally on small screens (default: true). */
  scrollable?: boolean;
};

export function TypeTabBar({
  tabs,
  activeId,
  onChange,
  className,
  scrollable = true,
}: TypeTabBarProps) {
  if (!tabs.length) return null;

  return (
    <nav
      role="tablist"
      aria-label="Mock type"
      className={cn(
        "flex gap-6 border-b border-border",
        scrollable &&
          "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors",
              active
                ? "border-brand-red text-brand-red"
                : tab.muted
                  ? "border-transparent text-slate-400 hover:text-slate-600"
                  : "border-transparent text-muted hover:text-navy",
            )}
          >
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold leading-none",
                  active
                    ? "bg-rose-100 text-brand-red"
                    : "bg-slate-100 text-muted",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
