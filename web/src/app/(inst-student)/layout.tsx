"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { InstStudentShell } from "@/components/inst-student/inst-student-shell";
import { WaitingApprovalView } from "@/components/inst-student/waiting-approval-view";
import {
  InstStudentProvider,
  useInstStudent,
} from "@/contexts/inst-student-context";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
    </div>
  );
}

function InstStudentGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, isInstitutionStudent, info } = useInstStudent();

  useEffect(() => {
    if (!loading && !isInstitutionStudent) {
      // A regular B2C student who landed here belongs to the standard portal.
      router.replace("/student");
    }
  }, [loading, isInstitutionStudent, router]);

  if (loading) {
    return <FullScreenSpinner />;
  }

  if (!isInstitutionStudent) {
    return <FullScreenSpinner />;
  }

  if (info && info.status !== "active") {
    return <WaitingApprovalView centerName={info.center?.name ?? "your center"} />;
  }

  return <InstStudentShell>{children}</InstStudentShell>;
}

export default function InstStudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["student"]}>
      <InstStudentProvider>
        <InstStudentGate>{children}</InstStudentGate>
      </InstStudentProvider>
    </AuthGuard>
  );
}
