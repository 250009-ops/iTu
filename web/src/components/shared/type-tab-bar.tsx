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
    <div
      className={cn(
        "rounded-xl border border-border bg-white shadow-sm",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label="Mock type"
        className={cn(
          "flex border-b border-border",
          scrollable && "overflow-x-auto",
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
                "relative shrink-0 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors sm:px-5",
                active
                  ? "border-navy text-navy"
                  : tab.muted
                    ? "border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-600"
                    : "border-transparent text-muted hover:border-slate-200 hover:text-navy",
              )}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "ml-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none",
                    active
                      ? "bg-navy text-white"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
