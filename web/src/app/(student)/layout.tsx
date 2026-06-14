"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { StudentMobileNav } from "@/components/student/student-mobile-nav";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentTopBar } from "@/components/student/student-top-bar";
import { StudentViewRouter } from "@/components/student/student-view-router";

export default function StudentLayout() {
  return (
    <AuthGuard allowedRoles={["student"]}>
      <SidebarProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
          <StudentTopBar />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <StudentSidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <StudentMobileNav />
              <main className="flex-1 overflow-y-auto">
                <StudentViewRouter />
              </main>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
