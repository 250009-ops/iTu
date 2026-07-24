"use client";

import { Suspense } from "react";
import { ContentStudioInner } from "@/components/admin/content/content-studio-view";
import { InstitutionContentProvider } from "@/contexts/institution-content-context";

export default function InstitutionContentStudioPage() {
  return (
    <InstitutionContentProvider>
      <Suspense fallback={null}>
        <ContentStudioInner />
      </Suspense>
    </InstitutionContentProvider>
  );
}
