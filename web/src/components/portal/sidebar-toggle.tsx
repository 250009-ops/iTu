"use client";

import { ChevronLeft } from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";

export function SidebarToggle() {
  const { collapsed, toggle } = useSidebar();

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "absolute right-0 top-1/2 z-30 hidden h-10 w-5 -translate-y-1/2 translate-x-1/2 md:flex",
          "items-center justify-end rounded-r-full border border-l-0 border-white/10 bg-navy pr-0.5 text-slate-400",
        )}
        aria-label="Expand sidebar"
      >
        <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      aria-label="Collapse sidebar"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
}
