import type { Metadata } from "next";
import { ExamLayoutGate } from "@/components/auth/exam-layout-gate";

export const metadata: Metadata = {
  title: "Exam in progress | itestu Platform",
  robots: { index: false, follow: false },
};

export default function ExamLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ExamLayoutGate>
      <div className="fixed inset-0 flex h-screen w-screen flex-col overflow-hidden bg-slate-100">
        {children}
      </div>
    </ExamLayoutGate>
  );
}
