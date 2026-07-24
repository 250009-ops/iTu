import type { Metadata } from "next";
import { Suspense } from "react";
import { InstitutionMockShopView } from "@/components/institution/mock-shop-view";

export const metadata: Metadata = { title: "Buy test sets" };

export default function InstitutionMockShopPage() {
  return (
    <Suspense fallback={null}>
      <InstitutionMockShopView />
    </Suspense>
  );
}
