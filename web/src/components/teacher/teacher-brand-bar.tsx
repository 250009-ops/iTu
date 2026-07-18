"use client";

import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { SidebarToggle } from "@/components/portal/sidebar-toggle";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";

export function TeacherBrandBar() {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        "relative hidden h-16 shrink-0 items-center overflow-visible border-b border-white/10 bg-navy text-white transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem] justify-center" : "w-60 justify-between px-5 lg:w-64",
      )}
    >
      <div className="flex items-center gap-3">
        <BrandMarkIcon size="lg" />
        {!collapsed && (
          <div>
            <p className="text-sm font-bold leading-tight">iTestU</p>
            <p className="text-xs text-emerald-400">Teacher Portal</p>
          </div>
        )}
      </div>

      <SidebarToggle />
    </div>
  );
}
