"use client";

import { SidebarProvider } from "@/contexts/sidebar-context";
import { AdminNavBadgesProvider } from "@/contexts/admin-nav-badges-context";
import { AdminPermissionsProvider } from "@/contexts/admin-permissions-context";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminRouteGuard } from "@/components/admin/admin-route-guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminPermissionsProvider>
        <AdminNavBadgesProvider>
          <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
            <AdminTopBar />
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <AdminSidebar />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <AdminMobileNav />
                <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
                    <AdminRouteGuard>{children}</AdminRouteGuard>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </AdminNavBadgesProvider>
      </AdminPermissionsProvider>
    </SidebarProvider>
  );
}
