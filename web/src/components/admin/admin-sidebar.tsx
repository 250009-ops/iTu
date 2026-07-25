"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Package,
  Radio,
  Receipt,
  Settings,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { PortalSidebarDownload } from "@/components/portal/portal-sidebar-download";
import { useAdminNavBadges } from "@/contexts/admin-nav-badges-context";
import { useAdminPermissions } from "@/contexts/admin-permissions-context";
import {
  adminNavGroups,
  isAdminNavItemActive,
  isAdminNavParentActive,
  type AdminNavChildItem,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/lib/admin/nav";
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
  bell: Bell,
  "help-circle": HelpCircle,
  shield: Shield,
} as const;

function navBadgeCount(
  item: AdminNavItem,
  badges: { liveSessions: number; openTickets: number },
): number | null {
  if (!item.badgeKey) return null;
  const count = badges[item.badgeKey];
  return count > 0 ? count : null;
}

function AdminNavLink({
  item,
  collapsed,
  badge,
  indent = false,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  badge: number | null;
  indent?: boolean;
}) {
  const pathname = usePathname();
  const href = item.href!;
  const active = isAdminNavItemActive(pathname, href);
  const Icon = iconMap[item.icon];

  return (
    <Link
      href={href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center rounded-lg text-sm font-medium transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
        indent && !collapsed && "pl-11",
        active
          ? "bg-white/10 text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {active && !collapsed && !indent && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-red" />
      )}
      {active && !collapsed && indent && (
        <span className="absolute left-7 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand-red" />
      )}
      {!indent && (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg",
            collapsed ? "h-9 w-9" : "h-8 w-8",
            active && collapsed && "bg-brand-red text-white",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      )}
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

function AdminNavDropdown({
  item,
  collapsed,
  badge,
  childItems,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  badge: number | null;
  childItems: AdminNavChildItem[];
}) {
  const pathname = usePathname();
  const filteredItem = { ...item, children: childItems };
  const parentActive = isAdminNavParentActive(pathname, filteredItem);
  const Icon = iconMap[item.icon];
  const [open, setOpen] = useState(parentActive);

  useEffect(() => {
    if (parentActive) setOpen(true);
  }, [parentActive]);

  if (collapsed) {
    const firstChild = childItems[0];
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
        {badge != null && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-red" />
        )}
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
        {badge != null && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1.5 text-[10px] font-bold">
            {badge}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {childItems.map((child) => {
            const active = isAdminNavItemActive(pathname, child.href);
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

export function AdminSidebar() {
  const { collapsed } = useSidebar();
  const badges = useAdminNavBadges();
  const { can, loading } = useAdminPermissions();

  const groups = useMemo(() => {
    if (loading) return [] as AdminNavGroup[];
    return adminNavGroups
      .map((group) => ({
        ...group,
        items: group.items
          .map((item) => {
            if (item.children?.length) {
              const children = item.children.filter((child) =>
                can(child.permission),
              );
              if (!children.length) return null;
              return { ...item, children };
            }
            if (item.permission && !can(item.permission)) return null;
            return item;
          })
          .filter((item): item is AdminNavItem => item != null),
      }))
      .filter((group) => group.items.length > 0);
  }, [can, loading]);

  return (
    <aside
      className={cn(
        "hidden h-full min-h-0 shrink-0 flex-col overflow-hidden bg-navy text-white transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-60 lg:w-64",
      )}
    >
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const badge = navBadgeCount(item, badges);
                if (item.children?.length) {
                  return (
                    <AdminNavDropdown
                      key={item.label}
                      item={item}
                      collapsed={collapsed}
                      badge={badge}
                      childItems={item.children}
                    />
                  );
                }
                return (
                  <AdminNavLink
                    key={item.href}
                    item={item}
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
