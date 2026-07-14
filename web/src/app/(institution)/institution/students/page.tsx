import type { Metadata } from "next";
import { Suspense } from "react";
import { InstitutionStudentsView } from "@/components/institution/students-view";

export const metadata: Metadata = { title: "Students" };

export default function InstitutionStudentsPage() {
  return (
    <Suspense fallback={null}>
      <InstitutionStudentsView />
    </Suspense>
  );
}
