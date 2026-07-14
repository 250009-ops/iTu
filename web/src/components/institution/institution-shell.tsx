"use client";

import { SidebarProvider } from "@/contexts/sidebar-context";
import { InstitutionNavBadgesProvider } from "@/contexts/institution-nav-badges-context";
import { InstitutionMobileNav } from "@/components/institution/institution-mobile-nav";
import { InstitutionSidebar } from "@/components/institution/institution-sidebar";
import { InstitutionTopBar } from "@/components/institution/institution-top-bar";

export function InstitutionShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <InstitutionNavBadgesProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
          <InstitutionTopBar />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <InstitutionSidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <InstitutionMobileNav />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </div>
      </InstitutionNavBadgesProvider>
    </SidebarProvider>
  );
}
