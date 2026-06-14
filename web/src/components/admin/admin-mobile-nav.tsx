"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Package,
  Radio,
  Receipt,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { adminNav } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  "book-open": BookOpen,
  package: Package,
  "user-check": UserCheck,
  radio: Radio,
  users: Users,
  receipt: Receipt,
  "alert-triangle": AlertTriangle,
  "bar-chart": BarChart3,
  settings: Settings,
} as const;

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-white px-2 py-2 md:hidden">
      {adminNav.map((item) => {
        const Icon = iconMap[item.icon];
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
