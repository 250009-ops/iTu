"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";
import { DASHBOARD_PATHS, type AuthSession, type UserRole } from "@/lib/auth/session";
import { helpPath, settingsPath } from "@/lib/portal/links";
import { getInitials, useAuth } from "@/hooks/use-auth";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

function roleLabel(role: UserRole): string {
  switch (role) {
    case "teacher":
      return "Examiner";
    case "admin":
      return "Admin";
    case "institution":
      return "Edu Center";
    default:
      return "Student";
  }
}

function dashboardLabel(role: UserRole): string {
  switch (role) {
    case "teacher":
      return "Examiner dashboard";
    case "admin":
      return "Admin console";
    case "institution":
      return "Centre dashboard";
    default:
      return "Go to dashboard";
  }
}

type MenuItem = {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
};

function accountMenuItems(session: AuthSession, pathname: string): MenuItem[] {
  const items: MenuItem[] = [
    {
      key: "dashboard",
      href: DASHBOARD_PATHS[session.role],
      label: dashboardLabel(session.role),
      icon: <LayoutDashboard className="h-4 w-4 text-slate-400" />,
    },
  ];

  if (session.role === "student") {
    items.push({
      key: "book",
      href: "/mock-exams",
      label: "Book a mock",
      icon: <CalendarCheck className="h-4 w-4 text-slate-400" />,
    });
  }

  items.push({
    key: "help",
    href: helpPath(session.role, pathname),
    label: "Help & support",
    icon: <CircleHelp className="h-4 w-4 text-slate-400" />,
  });

  if (session.role === "student" || session.role === "teacher" || session.role === "admin") {
    items.push({
      key: "profile",
      href: settingsPath(session.role),
      label: session.role === "admin" ? "Settings" : "Profile",
      icon: <UserRound className="h-4 w-4 text-slate-400" />,
    });
  }

  return items;
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 font-semibold text-white ring-2 ring-white/20",
        sizes[size],
      )}
    >
      {getInitials(name)}
    </div>
  );
}

function RolePill({ role }: { role: UserRole }) {
  return (
    <span className="mt-1 inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300">
      {roleLabel(role)}
    </span>
  );
}

function MenuLink({
  item,
  onNavigate,
  className,
}: {
  item: MenuItem;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white",
        className,
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function AccountIdentity({
  session,
  compact = false,
}: {
  session: AuthSession;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", compact && "min-w-0")}>
      <Avatar name={session.name} size={compact ? "sm" : "lg"} />
      <div className={cn("min-w-0", compact && "hidden md:block")}>
        <p className="truncate font-semibold text-white">{session.name}</p>
        <RolePill role={session.role} />
        {!compact && session.email ? (
          <p className="mt-1 truncate text-xs text-slate-400">{session.email}</p>
        ) : null}
      </div>
    </div>
  );
}

const PANEL_CLASS =
  "overflow-hidden rounded-2xl border border-white/10 bg-navy/95 shadow-2xl shadow-black/30 backdrop-blur-xl";

export function MarketingHeaderAuth({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { session, signOut, isAuthenticated, isHydrated } = useAuth();

  useClickOutside(ref, () => setOpen(false), open);

  if (!isHydrated) {
    return <div className={cn("hidden h-10 w-28 sm:block", className)} aria-hidden />;
  }

  if (!isAuthenticated || !session) {
    return (
      <Link
        href="/login"
        className={cn(
          "hidden rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:inline-flex",
          className,
        )}
      >
        Log in
      </Link>
    );
  }

  const menuItems = accountMenuItems(session, pathname);

  function closeMenu() {
    setOpen(false);
  }

  function handleSignOut() {
    signOut();
    closeMenu();
    router.push("/login");
  }

  return (
    <div ref={ref} className={cn("relative hidden sm:block", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-navy",
          open
            ? "ring-2 ring-white/30 ring-offset-2 ring-offset-navy"
            : "hover:ring-2 hover:ring-white/20 hover:ring-offset-2 hover:ring-offset-navy",
        )}
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={session.name} size="md" />
      </button>

      {open ? (
        <div className={cn("absolute right-0 top-full z-50 mt-2 w-72", PANEL_CLASS)}>
          <div className="border-b border-white/10 px-4 py-4">
            <AccountIdentity session={session} />
          </div>

          <div className="py-1">
            {menuItems.map((item) => (
              <MenuLink key={item.key} item={item} onNavigate={closeMenu} />
            ))}
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 text-sm font-semibold text-brand-red transition-colors hover:text-brand-red-hover"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Mobile drawer account section — identity + stacked portal links. */
export function MarketingMobileAuth({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, signOut, isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) return null;

  if (!isAuthenticated || !session) {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className="block rounded-lg border border-white/20 px-4 py-2.5 text-center text-sm font-semibold text-white"
      >
        Log in
      </Link>
    );
  }

  const menuItems = accountMenuItems(session, pathname);

  function handleSignOut() {
    signOut();
    onNavigate?.();
    router.push("/login");
  }

  return (
    <div className="space-y-3">
      <div className={cn(PANEL_CLASS, "px-4 py-4")}>
        <AccountIdentity session={session} compact />
        {session.email ? (
          <p className="mt-2 truncate text-xs text-slate-400 md:hidden">{session.email}</p>
        ) : null}
      </div>

      <div className={cn(PANEL_CLASS, "py-1")}>
        {menuItems.map((item) => (
          <MenuLink key={item.key} item={item} onNavigate={onNavigate} />
        ))}
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-brand-red transition-colors hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
