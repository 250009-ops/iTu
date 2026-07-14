"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { DASHBOARD_PATHS } from "@/lib/auth/session";
import { getInitials, useAuth } from "@/hooks/use-auth";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

export function MarketingHeaderAuth({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { session, signOut, isAuthenticated, isHydrated } = useAuth();

  useClickOutside(ref, () => setOpen(false), open);

  if (!isHydrated) {
    return <div className={cn("hidden h-10 w-20 sm:block", className)} aria-hidden />;
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

  const name = session.name;
  const dashboard = DASHBOARD_PATHS[session.role];

  function handleSignOut() {
    signOut();
    setOpen(false);
    router.push("/login");
  }

  return (
    <div ref={ref} className={cn("relative hidden sm:block", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-white/20 py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-white/10",
          open && "bg-white/10",
        )}
        aria-expanded={open}
        aria-label="Account menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
          {getInitials(name)}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-300 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="text-xs capitalize text-slate-400">{session.role}</p>
          </div>
          <div className="py-1">
            <Link
              href={dashboard}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-brand-red transition-colors hover:bg-white/5"
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

/** Mobile drawer variant — full-width log in or account actions. */
export function MarketingMobileAuth({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { session, signOut, isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) return null;

  if (!isAuthenticated || !session) {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className="flex-1 rounded-lg border border-white/20 px-4 py-2.5 text-center text-sm font-semibold text-white"
      >
        Log in
      </Link>
    );
  }

  const dashboard = DASHBOARD_PATHS[session.role];

  return (
    <>
      <Link
        href={dashboard}
        onClick={onNavigate}
        className="flex-1 rounded-lg border border-white/20 px-4 py-2.5 text-center text-sm font-semibold text-white"
      >
        Dashboard
      </Link>
      <button
        type="button"
        onClick={() => {
          signOut();
          onNavigate?.();
          router.push("/login");
        }}
        className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white"
      >
        Sign out
      </button>
    </>
  );
}
