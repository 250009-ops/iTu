"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = pathname?.startsWith("/register/teacher");

  return (
    <div
      className={cn(
        "w-full animate-fade-in",
        wide ? "max-w-2xl" : "max-w-md sm:max-w-lg",
      )}
    >
      {children}
    </div>
  );
}
