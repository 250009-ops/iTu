import type { Metadata } from "next";
import { InstitutionDashboardView } from "@/components/institution/dashboard-view";

export const metadata: Metadata = { title: "Institution Dashboard" };

export default function InstitutionDashboardPage() {
  return <InstitutionDashboardView />;
}
