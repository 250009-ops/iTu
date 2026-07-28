"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Search,
  Trophy,
  User,
} from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { PortalSidebarDownload } from "@/components/portal/portal-sidebar-download";
import { studentNav, navItemToView } from "@/lib/student/nav";
import { isStudentViewActive } from "@/lib/student/routes";
import { cn } from "@/lib/utils";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  search: Search,
  "calendar-days": CalendarDays,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  trophy: Trophy,
  user: User,
} as const;

export function StudentSidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col bg-navy text-white transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-60 lg:w-64",
      )}
    >
      <nav className="flex-1 space-y-1 px-3 py-4">
        {studentNav.map((item) => {
          const Icon = iconMap[item.icon];
          const view = navItemToView(item.href);
          const active =
            view != null
              ? isStudentViewActive(pathname, view)
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              title={collapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-red" />
              )}
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-lg",
                  collapsed ? "h-9 w-9" : "h-8 w-8",
                  active && collapsed && "bg-brand-red text-white",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1.5 text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badge != null && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-red" />
              )}
            </Link>
          );
        })}
      </nav>
      <PortalSidebarDownload collapsed={collapsed} />
    </aside>
  );
}
