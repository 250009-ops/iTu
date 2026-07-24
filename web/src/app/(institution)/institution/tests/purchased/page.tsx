"use client";

import { Suspense } from "react";
import { PurchasedTestsPanel } from "@/components/institution/content/purchased-tests-panel";

export default function InstitutionPurchasedTestsPage() {
  return (
    <Suspense fallback={null}>
      <PurchasedTestsPanel />
    </Suspense>
  );
}
