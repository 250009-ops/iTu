"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Search,
  Trophy,
  User,
} from "lucide-react";
import { navItemToView, studentNav } from "@/lib/student/nav";
import { isStudentViewActive } from "@/lib/student/routes";
import { cn } from "@/lib/utils";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  search: Search,
  "calendar-days": CalendarDays,
  trophy: Trophy,
  user: User,
} as const;

export function StudentMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-white px-2 py-2 md:hidden">
      {studentNav.map((item) => {
        const Icon = iconMap[item.icon];
        const view = navItemToView(item.href);
        const active =
          view != null
            ? isStudentViewActive(pathname, view)
            : pathname === item.href;

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
            {item.badge != null && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
