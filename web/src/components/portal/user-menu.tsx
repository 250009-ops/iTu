"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleHelp, LogOut } from "lucide-react";
import { getInitials, useAuth } from "@/hooks/use-auth";
import { useClickOutside } from "@/hooks/use-click-outside";
import { helpPath } from "@/lib/portal/links";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { session, signOut } = useAuth();

  useClickOutside(ref, () => setOpen(false), open);

  const name = session?.name ?? "User";
  const role =
    session?.role != null
      ? session.role.charAt(0).toUpperCase() + session.role.slice(1)
      : "Guest";

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  function handleSignOut() {
    signOut();
    router.push("/login");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors hover:bg-slate-50 sm:gap-3 sm:pr-3",
          open && "bg-slate-50",
        )}
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
          {getInitials(name)}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {name}
          </p>
          <p className="text-xs text-muted">{role}</p>
        </div>
        <ChevronDown
          className={cn(
            "hidden h-4 w-4 text-slate-400 transition-transform sm:block",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                {getInitials(name)}
              </div>
              <div>
                <p className="font-semibold text-navy">{name}</p>
                <span className="mt-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                  {role}
                </span>
              </div>
            </div>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={() => navigate(helpPath(session?.role))}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
            >
              <CircleHelp className="h-4 w-4 text-muted" />
              Help &amp; Support
            </button>
          </div>

          <div className="border-t border-border px-4 py-3">
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
      )}
    </div>
  );
}
