import type { Metadata } from "next";
import { InstitutionMockShopView } from "@/components/institution/mock-shop-view";

export const metadata: Metadata = { title: "Buy test sets" };

export default function InstitutionMockShopPage() {
  return <InstitutionMockShopView />;
}
