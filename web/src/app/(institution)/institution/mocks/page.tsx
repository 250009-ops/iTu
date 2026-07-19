import type { Metadata } from "next";
import { InstitutionMocksView } from "@/components/institution/mocks-view";

export const metadata: Metadata = { title: "Mocks" };

export default function InstitutionMocksPage() {
  return <InstitutionMocksView />;
}
