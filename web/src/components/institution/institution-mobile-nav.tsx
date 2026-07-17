"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Coins,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  UserCheck,
} from "lucide-react";
import { institutionNav } from "@/lib/institution/nav";
import { useInstitutionNavBadges } from "@/contexts/institution-nav-badges-context";
import { cn } from "@/lib/utils";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  coins: Coins,
  "graduation-cap": GraduationCap,
  "user-check": UserCheck,
  calendar: Calendar,
  "bar-chart": BarChart3,
  settings: Settings,
  "life-buoy": LifeBuoy,
} as const;

export function InstitutionMobileNav() {
  const pathname = usePathname();
  const { pendingStudents } = useInstitutionNavBadges();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-white px-2 py-2 md:hidden">
      {institutionNav.map((item) => {
        const Icon = iconMap[item.icon];
        const badge =
          item.badge === "pendingStudents" && pendingStudents > 0
            ? pendingStudents
            : null;
        const active =
          item.href === "/institution"
            ? pathname === "/institution"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
