"use client";

import { SidebarProvider } from "@/contexts/sidebar-context";
import { AdminNavBadgesProvider } from "@/contexts/admin-nav-badges-context";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminNavBadgesProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
          <AdminTopBar />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <AdminSidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <AdminMobileNav />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </div>
      </AdminNavBadgesProvider>
    </SidebarProvider>
  );
}
