import type { Metadata } from "next";
import { InstitutionReportsView } from "@/components/institution/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default function InstitutionReportsPage() {
  return <InstitutionReportsView />;
}
