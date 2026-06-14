"use client";

import { BookOpen, Headphones, Mic, PenLine } from "lucide-react";
import type { ContentModule } from "@/lib/admin/types";
import { useAdminContent } from "@/contexts/admin-content-context";
import { cn } from "@/lib/utils";

const icons = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

interface ModuleTabsProps {
  active: ContentModule;
  onChange: (module: ContentModule) => void;
}

export function ModuleTabs({ active, onChange }: ModuleTabsProps) {
  const { moduleTabs } = useAdminContent();

  return (
    <div className="flex flex-wrap gap-2">
      {moduleTabs.map((tab) => {
        const Icon = icons[tab.id];
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-navy text-white"
                : "border border-border bg-white text-muted hover:bg-slate-50 hover:text-navy",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-muted",
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
