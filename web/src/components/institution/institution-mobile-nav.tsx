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
  Package,
  Radio,
  Settings,
  UserCheck,
} from "lucide-react";
import { institutionNav, isInstitutionNavActive } from "@/lib/institution/nav";
import { useInstitutionNavBadges } from "@/contexts/institution-nav-badges-context";
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

export function InstitutionMobileNav() {
  const pathname = usePathname();
  const { pendingStudents, flaggedSessions } = useInstitutionNavBadges();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-white px-2 py-2 md:hidden">
      {institutionNav.map((item) => {
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
