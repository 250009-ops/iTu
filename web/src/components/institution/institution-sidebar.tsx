"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Coins,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Settings,
  UserCheck,
} from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { PortalSidebarDownload } from "@/components/portal/portal-sidebar-download";
import { useInstitutionNavBadges } from "@/contexts/institution-nav-badges-context";
import {
  institutionNavGroups,
  isInstitutionNavActive,
} from "@/lib/institution/nav";
import { cn } from "@/lib/utils";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  coins: Coins,
  "graduation-cap": GraduationCap,
  "user-check": UserCheck,
  calendar: Calendar,
  "file-text": FileText,
  "bar-chart": BarChart3,
  settings: Settings,
  "message-square": MessageSquare,
  radio: Radio,
} as const;

export function InstitutionSidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const { pendingStudents, flaggedSessions } = useInstitutionNavBadges();

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col bg-navy text-white transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-60 lg:w-64",
      )}
    >
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {institutionNavGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = iconMap[item.icon];
                const badge =
                  item.badge === "pendingStudents" && pendingStudents > 0
                    ? pendingStudents
                    : item.badge === "flaggedSessions" && flaggedSessions > 0
                      ? flaggedSessions
                      : null;
                const active = isInstitutionNavActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex items-center rounded-lg text-sm font-medium transition-colors",
                      collapsed
                        ? "justify-center px-2 py-2.5"
                        : "gap-3 px-3 py-2.5",
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
                        {badge != null && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1.5 text-[10px] font-bold">
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && badge != null && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-red" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <PortalSidebarDownload collapsed={collapsed} />
    </aside>
  );
}
