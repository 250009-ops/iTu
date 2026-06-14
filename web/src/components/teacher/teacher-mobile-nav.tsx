"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  Mic,
  PenLine,
  User,
  Wallet,
} from "lucide-react";
import { useTeacherNavBadges } from "@/contexts/teacher-nav-badges-context";
import { teacherNav } from "@/lib/teacher/nav";
import { cn } from "@/lib/utils";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  calendar: Calendar,
  mic: Mic,
  "pen-line": PenLine,
  wallet: Wallet,
  user: User,
} as const;

export function TeacherMobileNav() {
  const pathname = usePathname();
  const badges = useTeacherNavBadges();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-white px-2 py-2 md:hidden">
      {teacherNav.map((item) => {
        const Icon = iconMap[item.icon];
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const badge =
          item.badgeKey != null ? badges[item.badgeKey] : undefined;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
              active ? "bg-navy/10 text-navy" : "text-muted hover:bg-slate-100",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
            {badge != null && badge > 0 && (
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
