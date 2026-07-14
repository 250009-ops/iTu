"use client";

import { SidebarProvider } from "@/contexts/sidebar-context";
import { InstExaminerMobileNav } from "@/components/inst-examiner/inst-examiner-mobile-nav";
import { InstExaminerSidebar } from "@/components/inst-examiner/inst-examiner-sidebar";
import { InstExaminerTopBar } from "@/components/inst-examiner/inst-examiner-top-bar";

export function InstExaminerShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
        <InstExaminerTopBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <InstExaminerSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <InstExaminerMobileNav />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
