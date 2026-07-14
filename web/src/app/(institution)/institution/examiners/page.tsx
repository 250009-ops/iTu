import type { Metadata } from "next";
import { InstitutionExaminersView } from "@/components/institution/examiners-view";

export const metadata: Metadata = { title: "Examiners" };

export default function InstitutionExaminersPage() {
  return <InstitutionExaminersView />;
}
