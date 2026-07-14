"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { InstExaminerShell } from "@/components/inst-examiner/inst-examiner-shell";
import {
  InstExaminerProvider,
  useInstExaminer,
} from "@/contexts/inst-examiner-context";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
    </div>
  );
}

function InstExaminerGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, isInstitutionExaminer } = useInstExaminer();

  useEffect(() => {
    if (!loading && !isInstitutionExaminer) {
      // A marketplace teacher who landed here belongs to the standard portal.
      router.replace("/teacher/dashboard");
    }
  }, [loading, isInstitutionExaminer, router]);

  if (loading || !isInstitutionExaminer) {
    return <FullScreenSpinner />;
  }

  return <InstExaminerShell>{children}</InstExaminerShell>;
}

export default function InstExaminerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["teacher"]}>
      <InstExaminerProvider>
        <InstExaminerGate>{children}</InstExaminerGate>
      </InstExaminerProvider>
    </AuthGuard>
  );
}
