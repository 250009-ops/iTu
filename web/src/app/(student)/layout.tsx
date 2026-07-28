"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { MarketplaceMockFeedbackGate } from "@/components/student/feedback/marketplace-mock-feedback-gate";
import { InstitutionStudentRedirect } from "@/components/student/institution-student-redirect";
import { StudentMobileNav } from "@/components/student/student-mobile-nav";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentTopBar } from "@/components/student/student-top-bar";
import { StudentViewRouter } from "@/components/student/student-view-router";

function StudentMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Practice (and other dedicated App Router pages) must render `children`.
  // The SPA view router only owns the catch-all student views.
  const isPracticeRoute = pathname.startsWith("/student/practice");
  // Attempt/review use PracticeScreen with internal panes; hub scrolls itself.
  // Keep practice `<main>` height-constrained so `h-full` children fill the shell.
  const isPracticeAttemptRoute =
    pathname.startsWith("/student/practice/attempt/") ||
    pathname.startsWith("/student/practice/writing/");

  return (
    <main
      className={
        isPracticeAttemptRoute
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : "min-h-0 flex-1 overflow-y-auto"
      }
    >
      {isPracticeRoute ? children : <StudentViewRouter />}
    </main>
  );
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["student"]}>
      <InstitutionStudentRedirect>
        <SidebarProvider>
          <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
            <StudentTopBar />
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <StudentSidebar />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <StudentMobileNav />
                <StudentMain>{children}</StudentMain>
              </div>
            </div>
            <MarketplaceMockFeedbackGate />
          </div>
        </SidebarProvider>
      </InstitutionStudentRedirect>
    </AuthGuard>
  );
}
