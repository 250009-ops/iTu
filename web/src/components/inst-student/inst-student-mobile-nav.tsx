"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, MonitorPlay, User } from "lucide-react";
import { useInstStudent } from "@/contexts/inst-student-context";
import { instStudentNav, isInstStudentNavActive } from "@/lib/inst-student/nav";
import { cn } from "@/lib/utils";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  "monitor-play": MonitorPlay,
  "line-chart": LineChart,
  user: User,
} as const;

export function InstStudentMobileNav() {
  const pathname = usePathname();
  const { hasActiveMock } = useInstStudent();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-white px-2 py-2 md:hidden">
      {instStudentNav.map((item) => {
        const Icon = iconMap[item.icon];
        const active = isInstStudentNavActive(pathname, item.href);
        const badge = item.badge === "activeMock" && hasActiveMock ? 1 : null;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
              active ? "bg-navy/10 text-navy" : "text-muted hover:bg-slate-100",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
            {badge != null && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-bold text-white">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
