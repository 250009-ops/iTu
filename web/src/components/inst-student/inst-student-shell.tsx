"use client";

import { SidebarProvider } from "@/contexts/sidebar-context";
import { InstStudentMobileNav } from "@/components/inst-student/inst-student-mobile-nav";
import { InstStudentSidebar } from "@/components/inst-student/inst-student-sidebar";
import { InstStudentTopBar } from "@/components/inst-student/inst-student-top-bar";

export function InstStudentShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
        <InstStudentTopBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <InstStudentSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <InstStudentMobileNav />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
