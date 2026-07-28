"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { InstStudentMobileNav } from "@/components/inst-student/inst-student-mobile-nav";
import { InstStudentSidebar } from "@/components/inst-student/inst-student-sidebar";
import { InstStudentTopBar } from "@/components/inst-student/inst-student-top-bar";

function InstStudentMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Attempt/review use PracticeScreen with internal panes; hub scrolls itself.
  // Keep practice `<main>` height-constrained so `h-full` children fill the shell.
  const isPracticeAttemptRoute =
    pathname.startsWith("/inst-student/practice/attempt/") ||
    pathname.startsWith("/inst-student/practice/writing/");

  return (
    <main
      className={
        isPracticeAttemptRoute
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : "min-h-0 flex-1 overflow-y-auto"
      }
    >
      {children}
    </main>
  );
}

export function InstStudentShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
        <InstStudentTopBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <InstStudentSidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <InstStudentMobileNav />
            <InstStudentMain>{children}</InstStudentMain>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
