import type { Metadata } from "next";
import { InstitutionMockSetsView } from "@/components/admin/institution-mock-sets/institution-mock-sets-view";

export const metadata: Metadata = { title: "Institution Mock Sets" };

export default function AdminInstitutionMockSetsPage() {
  return <InstitutionMockSetsView />;
}
