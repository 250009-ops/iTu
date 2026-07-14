"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  GraduationCap,
  LayoutDashboard,
  Package,
  Radio,
  Receipt,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { adminNav, type AdminNavItem } from "@/lib/admin/nav";
import { useAdminNavBadges } from "@/contexts/admin-nav-badges-context";
import { cn } from "@/lib/utils";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  "book-open": BookOpen,
  package: Package,
  "user-check": UserCheck,
  radio: Radio,
  users: Users,
  "graduation-cap": GraduationCap,
  receipt: Receipt,
  "alert-triangle": AlertTriangle,
  "bar-chart": BarChart3,
  building: Building2,
  settings: Settings,
} as const;

function navBadgeCount(
  item: AdminNavItem,
  badges: { liveSessions: number; openTickets: number },
): number | null {
  if (!item.badgeKey) return null;
  const count = badges[item.badgeKey];
  return count > 0 ? count : null;
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const badges = useAdminNavBadges();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-white px-2 py-2 md:hidden">
      {adminNav.map((item) => {
        const Icon = iconMap[item.icon];
        const badge = navBadgeCount(item, badges);
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

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
