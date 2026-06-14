"use client";

import { SidebarProvider } from "@/contexts/sidebar-context";
import { TeacherNavBadgesProvider } from "@/contexts/teacher-nav-badges-context";
import { TeacherMobileNav } from "@/components/teacher/teacher-mobile-nav";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";
import { TeacherTopBar } from "@/components/teacher/teacher-top-bar";

export function TeacherShell({ children }: { children: React.ReactNode }) {
  return (
    <TeacherNavBadgesProvider>
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
        <TeacherTopBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <TeacherSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TeacherMobileNav />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </div>
    </SidebarProvider>
    </TeacherNavBadgesProvider>
  );
}
