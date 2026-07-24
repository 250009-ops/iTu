"use client";

import { Suspense } from "react";
import { ContentStudioInner } from "@/components/admin/content/content-studio-view";
import { InstitutionContentProvider } from "@/contexts/institution-content-context";

export default function InstitutionContentPage() {
  return (
    <InstitutionContentProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={null}>
          <ContentStudioInner />
        </Suspense>
      </div>
    </InstitutionContentProvider>
  );
}
