"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const roles = [
  {
    href: "/register",
    label: "Student",
    description: "Book & take IELTS mocks",
    icon: UserRound,
    match: (path: string) => path === "/register",
  },
  {
    href: "/register/teacher",
    label: "Examiner",
    description: "Apply to grade & teach",
    icon: GraduationCap,
    match: (path: string) => path.startsWith("/register/teacher"),
  },
] as const;

export function RegisterRoleTabs() {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-2 gap-3">
      {roles.map((role) => {
        const active = role.match(pathname ?? "");
        const Icon = role.icon;
        return (
          <Link
            key={role.href}
            href={role.href}
            className={cn(
              "group rounded-xl border p-4 transition-all",
              active
                ? "border-navy bg-navy/5 ring-1 ring-navy/15"
                : "border-border bg-white hover:border-slate-300 hover:bg-slate-50/80",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                active ? "bg-navy text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-navy">{role.label}</p>
            <p className="mt-0.5 text-xs text-muted">{role.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
