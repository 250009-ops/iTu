"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Coins,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Package,
  Radio,
  Settings,
  UserCheck,
} from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { PortalSidebarDownload } from "@/components/portal/portal-sidebar-download";
import { useInstitutionNavBadges } from "@/contexts/institution-nav-badges-context";
import {
  institutionNavGroups,
  isInstitutionNavItemActive,
  isInstitutionNavParentActive,
  type InstitutionNavItem,
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
  package: Package,
  radio: Radio,
} as const;

function InstitutionNavLink({
  item,
  collapsed,
  badge,
}: {
  item: InstitutionNavItem & { href: string };
  collapsed: boolean;
  badge: number | null;
}) {
  const pathname = usePathname();
  const active = isInstitutionNavItemActive(pathname, item.href);
  const Icon = iconMap[item.icon];

  return (
    <Link
      href={item.href}
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
}

function InstitutionNavDropdown({
  item,
  collapsed,
}: {
  item: InstitutionNavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const parentActive = isInstitutionNavParentActive(pathname, item);
  const Icon = iconMap[item.icon];
  const [open, setOpen] = useState(parentActive);

  useEffect(() => {
    if (parentActive) setOpen(true);
  }, [parentActive]);

  if (collapsed) {
    const firstChild = item.children![0];
    return (
      <Link
        href={firstChild.href}
        title={item.label}
        className={cn(
          "relative flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-colors",
          parentActive
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:bg-white/5 hover:text-white",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            parentActive && "bg-brand-red text-white",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
          parentActive
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:bg-white/5 hover:text-white",
        )}
      >
        {parentActive && (
          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-red" />
        )}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="flex-1">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => {
            const active = isInstitutionNavItemActive(pathname, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "relative flex items-center rounded-lg py-2 pl-11 pr-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                {active && (
                  <span className="absolute left-7 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand-red" />
                )}
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function InstitutionSidebar() {
  const { collapsed } = useSidebar();
  const { pendingStudents, flaggedSessions } = useInstitutionNavBadges();

  return (
    <aside
      className={cn(
        "hidden h-full min-h-0 shrink-0 flex-col overflow-hidden bg-navy text-white transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-60 lg:w-64",
      )}
    >
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {institutionNavGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const badge =
                  item.badge === "pendingStudents" && pendingStudents > 0
                    ? pendingStudents
                    : item.badge === "flaggedSessions" && flaggedSessions > 0
                      ? flaggedSessions
                      : null;

                if (item.children?.length) {
                  return (
                    <InstitutionNavDropdown
                      key={item.label}
                      item={item}
                      collapsed={collapsed}
                    />
                  );
                }

                return (
                  <InstitutionNavLink
                    key={item.href}
                    item={{ ...item, href: item.href! }}
                    collapsed={collapsed}
                    badge={badge}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <PortalSidebarDownload collapsed={collapsed} className="shrink-0" />
    </aside>
  );
}
